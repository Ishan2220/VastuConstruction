import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry } from './journal.service.js';
import { normalizePaymentMethod } from '../utils/normalizers.js';
import type { Prisma, } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.LabourWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { skill: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.labour.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { assignments: true, attendance: true, payments: true } },
      },
    }),
    prisma.labour.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const labour = await prisma.labour.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignments: {
        where: { isActive: true },
        include: { project: { select: { id: true, name: true, city: true } } },
      },
      attendance: {
        take: 30,
        orderBy: { date: 'desc' },
      },
      payments: {
        take: 20,
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!labour) throw new ApiError(404, 'Labour not found');
  return labour;
};

export const create = async (data: Prisma.LabourCreateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...rest } = data;
  const labour = await prisma.labour.create({ data: rest });
  eventBus.publishMutation('Labour', 'CREATE', userId, labour.id, idempotencyKey || crypto.randomUUID(), labour, null);
  return labour;
};

export const update = async (id: string, data: Prisma.LabourUpdateInput & { idempotencyKey?: string }, userId: string) => {
  const oldLabour = await getById(id);
  const { idempotencyKey, ...rest } = data;
  const labour = await prisma.labour.update({ where: { id }, data: rest });
  eventBus.publishMutation('Labour', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), labour, oldLabour);
  return labour;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldLabour = await getById(id);
  const labour = await prisma.labour.update({ where: { id }, data: { deletedAt: new Date() } });
  eventBus.publishMutation('Labour', 'DELETE', userId, id, idempotencyKey || crypto.randomUUID(), null, oldLabour);
  return labour;
};

// Attendance management
export const recordAttendance = async (
  labourId: string,
  date: Date,
  present: boolean,
  halfDay = false,
  overtime = 0,
  notes?: string
) => {
  return prisma.attendance.upsert({
    where: { labourId_date: { labourId, date } },
    update: { present, halfDay, overtime, notes },
    create: { labourId, date, present, halfDay, overtime, notes },
  });
};

export const getAttendanceByDate = async (date: Date) => {
  return prisma.attendance.findMany({
    where: { date },
    include: { labour: { select: { id: true, name: true, skill: true, dailyWage: true } } },
  });
};

// Assignment management
export const assignToProject = async (labourId: string, projectId: string, startDate: Date) => {
  return prisma.labourAssignment.create({
    data: { labourId, projectId, startDate },
  });
};

// Payment management
export const recordPayment = async (
  labourId: string,
  amount: number,
  paymentDate: Date,
  paymentMethod?: string,
  isAdvance = false,
  notes?: string,
  accountId?: string | null,
  userId?: string,
  idempotencyKey?: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.labourPayment.create({
      data: {
        labourId,
        amount: Number(amount) || 0,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: normalizePaymentMethod(paymentMethod),
        isAdvance,
        notes,
      },
      include: {
        labour: { select: { name: true } }
      }
    });

    await postJournalEntry({
      entryDate: payment.paymentDate,
      description: `Labour ${isAdvance ? 'Advance' : 'Payment'} to ${payment.labour.name} - ${notes || ''}`,
      referenceId: payment.id,
      referenceType: 'LABOUR_PAYMENT',
      createdById: userId || 'SYSTEM',
      lines: [
        { accountId: null, debitAmount: Number(payment.amount), creditAmount: 0, description: 'Labour Expense' },
        { accountId: accountId || null, debitAmount: 0, creditAmount: Number(payment.amount), description: 'Bank/Cash Outflow' }
      ]
    }, tx);

    return payment;
  });

  if (userId) {
    eventBus.publishMutation('LabourPayment', 'CREATE', userId, result.id, idempotencyKey || crypto.randomUUID(), result, null);
  }

  return result;
};
