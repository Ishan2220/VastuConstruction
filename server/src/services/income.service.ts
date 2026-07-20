import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma, } from '@prisma/client';
import { normalizePaymentMethod, cleanRelationId } from '../utils/normalizers.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry, reverseJournalEntry } from './journal.service.js';
import { randomUUID } from 'crypto';

interface ListParams {
  page?: number;
  limit?: number;
  clientId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, clientId, projectId, startDate, endDate, sortBy = 'paymentDate', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const cleanedClientId = cleanRelationId(clientId);
  const cleanedProjectId = cleanRelationId(projectId);

  const where: Prisma.IncomeWhereInput = {
    ...(cleanedClientId && { clientId: cleanedClientId }),
    ...(cleanedProjectId && { projectId: cleanedProjectId }),
    ...(startDate && endDate && {
      paymentDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.income.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, phone: true } },
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
      project: true,
      account: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!income) throw new ApiError(404, 'Income record not found');
  return income;
};

export const create = async (
  data: {
    clientId: string;
    projectId?: string | null;
    amount: number;
    gstAmount?: number;
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
  const { idempotencyKey, ...restData } = data as any;
  const cleanedData = {
    ...restData,
    clientId: data.clientId,
    projectId: cleanRelationId(data.projectId) || null,
    accountId: cleanRelationId(data.accountId) || null,
    amount: Number(data.amount) || 0,
    gstAmount: Number(data.gstAmount) || 0,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    invoiceNo: cleanRelationId(data.invoiceNo) || null,
    reference: cleanRelationId(data.reference) || null,
    notes: cleanRelationId(data.notes) || null,
    receiptUrl: cleanRelationId(data.receiptUrl) || null,
  };

  const income = await prisma.$transaction(async (tx) => {
    const created = await tx.income.create({
      data: {
        ...cleanedData,
        createdById: userId,
      },
    });

    // Double-Entry Ledger
    const totalAmt = Number(cleanedData.amount) + Number(cleanedData.gstAmount);
    await postJournalEntry({
      entryDate: cleanedData.paymentDate,
      description: `Income: ${cleanedData.notes || cleanedData.type}`,
      referenceId: created.id,
      referenceType: 'INCOME',
      createdById: userId,
      lines: [
        { accountId: cleanedData.accountId, debitAmount: totalAmt, creditAmount: 0, description: 'Income deposit' },
        { accountId: null, debitAmount: 0, creditAmount: totalAmt, description: 'Revenue recognition' }
      ]
    }, tx);

    return created;
  });

  eventBus.publishMutation('Income', 'CREATE', userId, income.id, (data as any).idempotencyKey || randomUUID(), income, null);
  return income;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldIncome = await getById(id);

  await prisma.$transaction(async (tx) => {
    await reverseJournalEntry(id, userId, 'Income deletion reversal', tx);
    
    // Instead of actual deleting, since schema has no deletedAt, we delete the row but the Journal Entry remains
    await tx.income.delete({ where: { id } });
  });

  eventBus.publishMutation('Income', 'DELETE', userId, id, idempotencyKey || randomUUID(), null, oldIncome);
  return { success: true };
};
