import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma, } from '@prisma/client';
import { normalizePaymentMethod, normalizeExpenseType, cleanRelationId } from '../utils/normalizers.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry, reverseJournalEntry } from './journal.service.js';
import { randomUUID } from 'crypto';

interface ListParams {
  page?: number;
  limit?: number;
  projectId?: string;
  vendorId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, projectId, vendorId, type, startDate, endDate, sortBy = 'paymentDate', sortOrder = 'desc' } = params;
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
  if (!expense) throw new ApiError(404, 'Expense record not found');
  return expense;
};

export const create = async (
  data: {
    projectId?: string | null;
    vendorId?: string | null;
    type?: string;
    amount: number;
    gstAmount?: number;
    paymentDate: Date;
    paymentMethod?: string;
    accountId?: string | null;
    description?: string | null;
    billUrl?: string | null;
    remarks?: string | null;
  },
  userId: string
) => {
  const { idempotencyKey, ...restData } = data as any;
  const cleanedData = {
    ...restData,
    projectId: cleanRelationId(data.projectId) || null,
    vendorId: cleanRelationId(data.vendorId) || null,
    accountId: cleanRelationId(data.accountId) || null,
    type: normalizeExpenseType(data.type),
    amount: Number(data.amount) || 0,
    gstAmount: Number(data.gstAmount) || 0,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    paymentMethod: normalizePaymentMethod(data.paymentMethod),
    description: cleanRelationId(data.description) || null,
    billUrl: cleanRelationId(data.billUrl) || null,
    remarks: cleanRelationId(data.remarks) || null,
  };

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        ...cleanedData,
        createdById: userId,
      },
    });

    // Double-Entry Ledger
    const totalAmt = Number(cleanedData.amount) + Number(cleanedData.gstAmount);
    await postJournalEntry({
      entryDate: cleanedData.paymentDate,
      description: `Expense: ${cleanedData.description || cleanedData.type}`,
      referenceId: created.id,
      referenceType: 'EXPENSE',
      createdById: userId,
      lines: [
        { accountId: null, debitAmount: totalAmt, creditAmount: 0, description: 'Expense recognition' },
        { accountId: cleanedData.accountId, debitAmount: 0, creditAmount: totalAmt, description: 'Expense payment' }
      ]
    }, tx);

    return created;
  });

  eventBus.publishMutation('Expense', 'CREATE', userId, expense.id, (data as any).idempotencyKey || randomUUID(), expense, null);
  return expense;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldExpense = await getById(id);

  await prisma.$transaction(async (tx) => {
    await reverseJournalEntry(id, userId, 'Expense deletion reversal', tx);
    
    // Instead of actually deleting, we soft delete or keep it for audit.
    // For now, since schema.prisma doesn't have deletedAt on Expense, we will delete but the JournalEntry remains!
    await tx.expense.delete({ where: { id } });
  });

  eventBus.publishMutation('Expense', 'DELETE', userId, id, idempotencyKey || randomUUID(), null, oldExpense);
  return { success: true };
};
