import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma, } from '@prisma/client';
import { normalizePaymentMethod, cleanRelationId } from '../utils/normalizers.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry, reverseJournalEntry } from './journal.service.js';
import { randomUUID } from 'crypto';
import { checkFinancialLock } from '../utils/financialLock.js';

interface ListParams {
  page?: number;
  limit?: number;
  clientId?: string;
  leadId?: string;
  vendorId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, clientId, leadId, vendorId, projectId, startDate, endDate, sortBy = 'paymentDate', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const cleanedClientId = cleanRelationId(clientId);
  const cleanedLeadId = cleanRelationId(leadId);
  const cleanedVendorId = cleanRelationId(vendorId);
  const cleanedProjectId = cleanRelationId(projectId);

  const where: Prisma.IncomeWhereInput = {
    ...(cleanedClientId && { clientId: cleanedClientId }),
    ...(cleanedLeadId && { leadId: cleanedLeadId }),
    ...(cleanedVendorId && { vendorId: cleanedVendorId }),
    ...(cleanedProjectId && { projectId: cleanedProjectId }),
    ...(startDate && endDate && {
      paymentDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
    deletedAt: null,
  };

  const [data, total] = await Promise.all([
    prisma.income.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        lead: { select: { id: true, name: true, phone: true } },
        vendor: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, name: true } },
        account: { select: { id: true, bankName: true, accountNo: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.income.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const income = await prisma.income.findUnique({
    where: { id },
    include: {
      client: true,
      lead: true,
      vendor: true,
      project: true,
      account: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!income || income.deletedAt) throw new ApiError(404, 'Income record not found');
  return income;
};

export const create = async (
  data: {
    clientId?: string | null;
    leadId?: string | null;
    vendorId?: string | null;
    projectId?: string | null;
    amount: number;
    gstMode?: 'NONE' | 'PERCENTAGE' | 'AMOUNT';
    gstPercentage?: number | null;
    gstAmount?: number;
    totalAmount?: number;
    paymentDate: Date;
    paymentMethod?: string;
    accountId?: string | null;
    type?: string;
    invoiceNo?: string | null;
    reference?: string | null;
    notes?: string | null;
    receiptUrl?: string | null;
  },
  userId: string
) => {
  const { idempotencyKey, receivedFromType, ...restData } = data as any;
  const gstMode = data.gstMode || 'NONE';
  const gstAmount = Number(data.gstAmount) || 0;
  const amount = Number(data.amount) || 0;
  let totalAmount = Number(data.totalAmount) || (amount + gstAmount);
  
  const cleanedData = {
    ...restData,
    clientId: cleanRelationId(data.clientId) || null,
    leadId: cleanRelationId(data.leadId) || null,
    vendorId: cleanRelationId(data.vendorId) || null,
    projectId: cleanRelationId(data.projectId) || null,
    accountId: cleanRelationId(data.accountId) || null,
    amount,
    gstMode,
    gstPercentage: data.gstPercentage ? Number(data.gstPercentage) : null,
    gstAmount,
    totalAmount,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    invoiceNo: cleanRelationId(data.invoiceNo) || null,
    reference: cleanRelationId(data.reference) || null,
    notes: cleanRelationId(data.notes) || null,
    receiptUrl: cleanRelationId(data.receiptUrl) || null,
  };

  if (!cleanedData.accountId) {
    throw new ApiError(400, 'Account ID is required for logging income');
  }

  await checkFinancialLock(cleanedData.paymentDate);

  const income = await prisma.$transaction(async (tx) => {
    const created = await tx.income.create({
      data: {
        ...cleanedData,
        createdById: userId,
      },
    });

    if (cleanedData.leadId) {
      const leadObj = await tx.lead.findUnique({ where: { id: cleanedData.leadId } });
      if (leadObj) {
        const currentPending = Number(leadObj.pendingAmount || leadObj.budget || 0);
        const newPending = Math.max(0, currentPending - cleanedData.totalAmount);
        await tx.lead.update({
          where: { id: cleanedData.leadId },
          data: {
            paymentStatus: newPending === 0 ? 'PAID' : 'PARTIAL',
            paymentMode: cleanedData.paymentMethod,
            pendingAmount: newPending,
          }
        });
      }
    }

    // Double-Entry Ledger with Flexible GST split
    const lines = [];
    // 1. Bank Account receives the Total Amount (Base + GST)
    lines.push({ accountId: cleanedData.accountId, debitAmount: cleanedData.totalAmount, creditAmount: 0, description: 'Income deposit (Total)' });
    // 2. Revenue Account (Null for now) receives the Base Amount
    lines.push({ accountId: null, debitAmount: 0, creditAmount: cleanedData.amount, description: 'Revenue recognition (Base)' });
    // 3. Tax Account (Null for now) receives the GST Amount if any
    if (cleanedData.gstAmount > 0) {
      lines.push({ accountId: null, debitAmount: 0, creditAmount: cleanedData.gstAmount, description: 'GST Collected' });
    }

    await postJournalEntry({
      entryDate: cleanedData.paymentDate,
      description: `Income: ${cleanedData.notes || cleanedData.type}`,
      referenceId: created.id,
      referenceType: 'INCOME',
      createdById: userId,
      lines
    }, tx);

    return created;
  });

  eventBus.publishMutation('Income', 'CREATE', userId, income.id, (data as any).idempotencyKey || randomUUID(), income, null);
  return income;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldIncome = await getById(id);
  await checkFinancialLock(oldIncome.paymentDate);

  await prisma.$transaction(async (tx) => {
    await reverseJournalEntry(id, userId, 'Income deletion reversal', tx);
    
    await tx.income.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  eventBus.publishMutation('Income', 'DELETE', userId, id, idempotencyKey || randomUUID(), null, oldIncome);
  
  if (oldIncome.accountId) {
    eventBus.publishMutation('BankAccount', 'UPDATE', userId, oldIncome.accountId, randomUUID(), { id: oldIncome.accountId }, null);
  }
  eventBus.publishMutation('DashboardStats', 'UPDATE', userId, 'dashboard', randomUUID(), null, null);
  return { success: true };
};
