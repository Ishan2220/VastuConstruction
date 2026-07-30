import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma, } from '@prisma/client';
import { normalizePaymentMethod, normalizeExpenseType, cleanRelationId } from '../utils/normalizers.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry, reverseJournalEntry } from './journal.service.js';
import { randomUUID } from 'crypto';
import { checkFinancialLock } from '../utils/financialLock.js';

interface ListParams {
  page?: number;
  limit?: number;
  projectId?: string;
  vendorId?: string;
  type?: string;
  isPersonal?: boolean | string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, projectId, vendorId, type, startDate, endDate, isPersonal, sortBy = 'paymentDate', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const cleanedProjectId = cleanRelationId(projectId);
  const cleanedVendorId = cleanRelationId(vendorId);

  const where: Prisma.ExpenseWhereInput = {
    ...(cleanedProjectId && { projectId: cleanedProjectId }),
    ...(cleanedVendorId && { vendorId: cleanedVendorId }),
    ...(type && { type: normalizeExpenseType(type) }),
    ...(startDate && endDate && {
      paymentDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
    ...(isPersonal !== undefined && { isPersonal: isPersonal === 'true' || isPersonal === true }),
    deletedAt: null,
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        project: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true, category: true } },
        account: { select: { id: true, bankName: true, accountNo: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      project: true,
      vendor: true,
      account: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!expense || expense.deletedAt) throw new ApiError(404, 'Expense record not found');
  return expense;
};

export const create = async (
  data: {
    projectId?: string | null;
    vendorId?: string | null;
    type?: string;
    amount: number;
    gstMode?: 'NONE' | 'PERCENTAGE' | 'AMOUNT';
    gstPercentage?: number | null;
    gstAmount?: number;
    totalAmount?: number;
    paymentDate: Date;
    paymentMethod?: string;
    accountId?: string | null;
    description?: string | null;
    billUrl?: string | null;
    remarks?: string | null;
    isPersonal?: boolean;
  },
  userId: string
) => {
  const { idempotencyKey, ...restData } = data as any;
  const gstMode = data.gstMode || 'NONE';
  const gstAmount = Number(data.gstAmount) || 0;
  const amount = Number(data.amount) || 0;
  let totalAmount = Number(data.totalAmount) || (amount + gstAmount);
  
  const cleanedData = {
    ...restData,
    projectId: cleanRelationId(data.projectId) || null,
    vendorId: cleanRelationId(data.vendorId) || null,
    accountId: cleanRelationId(data.accountId) || null,
    isPersonal: data.isPersonal || false,
    type: normalizeExpenseType(data.type),
    amount,
    gstMode,
    gstPercentage: data.gstPercentage ? Number(data.gstPercentage) : null,
    gstAmount,
    totalAmount,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    description: cleanRelationId(data.description) || null,
    billUrl: cleanRelationId(data.billUrl) || null,
    remarks: cleanRelationId(data.remarks) || null,
  };

  if (!cleanedData.accountId) {
    throw new ApiError(400, 'Account ID is required for logging expenses');
  }

  await checkFinancialLock(cleanedData.paymentDate);

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        ...cleanedData,
        createdById: userId,
      },
    });

    // Double-Entry Ledger with Flexible GST split
    const lines = [];
    // 1. Bank Account pays the Total Amount (Base + GST)
    lines.push({ accountId: cleanedData.accountId, debitAmount: 0, creditAmount: cleanedData.totalAmount, description: 'Expense payment (Total)' });
    // 2. Expense Account (Null for now) receives the Base Amount (Debit increases expenses)
    lines.push({ accountId: null, debitAmount: cleanedData.amount, creditAmount: 0, description: 'Expense recognition (Base)' });
    // 3. Tax Account (Null for now) receives the GST Amount if any (Debit)
    if (cleanedData.gstAmount > 0) {
      lines.push({ accountId: null, debitAmount: cleanedData.gstAmount, creditAmount: 0, description: 'GST Paid' });
    }

    await postJournalEntry({
      entryDate: cleanedData.paymentDate,
      description: `Expense: ${cleanedData.description || cleanedData.type}`,
      referenceId: created.id,
      referenceType: 'EXPENSE',
      createdById: userId,
      lines
    }, tx);

    return created;
  });

  eventBus.publishMutation('Expense', 'CREATE', userId, expense.id, (data as any).idempotencyKey || randomUUID(), expense, null);
  return expense;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldExpense = await getById(id);
  await checkFinancialLock(oldExpense.paymentDate);

  await prisma.$transaction(async (tx) => {
    await reverseJournalEntry(id, userId, 'Expense deletion reversal', tx);
    
    await tx.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  eventBus.publishMutation('Expense', 'DELETE', userId, id, idempotencyKey || randomUUID(), null, oldExpense);
  
  if (oldExpense.accountId) {
    eventBus.publishMutation('BankAccount', 'UPDATE', userId, oldExpense.accountId, randomUUID(), { id: oldExpense.accountId }, null);
  }
  eventBus.publishMutation('DashboardStats', 'UPDATE', userId, 'dashboard', randomUUID(), null, null);
  return { success: true };
};
