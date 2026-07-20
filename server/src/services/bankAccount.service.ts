import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma } from '@prisma/client';

export const list = async () => {
  const accounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { bankName: 'asc' },
    include: {
      _count: { select: { incomes: true, expenses: true } },
    },
  });
  return accounts;
};

export const getById = async (id: string) => {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      incomes: { take: 10, orderBy: { paymentDate: 'desc' }, include: { client: { select: { name: true } } } },
      expenses: { take: 10, orderBy: { paymentDate: 'desc' }, include: { vendor: { select: { name: true } } } },
    },
  });
  if (!account) throw new ApiError(404, 'Bank account not found');
  return account;
};

export const create = async (payload: any, userId: string) => {
  const { ifscCode, accountType, ...validData } = payload;
  const data: Prisma.BankAccountCreateInput = {
    bankName: validData.bankName || 'Unknown Bank',
    accountName: validData.accountName || `${validData.bankName || 'Corporate'} Account`,
    accountNo: String(validData.accountNo || Date.now()),
    ifsc: validData.ifsc || ifscCode || null,
    branch: validData.branch || null,
    balance: Number(validData.balance) || 0,
    isActive: true,
  };
  const account = await prisma.bankAccount.create({ data });
  eventBus.publishMutation('BankAccount', 'CREATE', userId, account.id, crypto.randomUUID() || crypto.randomUUID(), account, null);
  return account;
};

export const update = async (id: string, payload: any, userId: string) => {
  const oldAccount = await getById(id);
  const { ifscCode, accountType, id: _id, createdAt, updatedAt, incomes, expenses, _count, ...validData } = payload;
  const data: Prisma.BankAccountUpdateInput = {
    ...(validData.bankName && { bankName: validData.bankName }),
    ...(validData.accountName && { accountName: validData.accountName }),
    ...(validData.accountNo && { accountNo: String(validData.accountNo) }),
    ...((validData.ifsc || ifscCode) && { ifsc: validData.ifsc || ifscCode }),
    ...(validData.branch !== undefined && { branch: validData.branch }),
    ...(validData.balance !== undefined && { balance: Number(validData.balance) }),
  };
  const account = await prisma.bankAccount.update({ where: { id }, data });
  eventBus.publishMutation('BankAccount', 'UPDATE', userId, id, crypto.randomUUID() || crypto.randomUUID(), account, oldAccount);
  return account;
};

export const remove = async (id: string, userId: string) => {
  const oldAccount = await getById(id);
  const account = await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
  eventBus.publishMutation('BankAccount', 'DELETE', userId, id, crypto.randomUUID() || crypto.randomUUID(), { isActive: false }, oldAccount);
  return account;
};
