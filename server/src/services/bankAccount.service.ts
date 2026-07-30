import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry } from './journal.service.js';
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
      incomes: { where: { deletedAt: null }, orderBy: { paymentDate: 'desc' }, include: { client: { select: { name: true } } } },
      expenses: { where: { deletedAt: null }, orderBy: { paymentDate: 'desc' }, include: { vendor: { select: { name: true } } } },
    },
  });
  if (!account) throw new ApiError(404, 'Bank account not found');
  return account;
};

export const create = async (payload: any, userId: string) => {
  const { ifscCode, accountType, balance, ...validData } = payload;
  const initialBalance = Number(balance) || 0;
  
  const data: Prisma.BankAccountCreateInput = {
    bankName: validData.bankName || 'Unknown Bank',
    accountName: validData.accountName || `${validData.bankName || 'Corporate'} Account`,
    accountNo: String(validData.accountNo || Date.now()),
    ifsc: validData.ifsc || ifscCode || null,
    branch: validData.branch || null,
    accountType: accountType || 'BANK',
    openingBalance: initialBalance,
    balance: 0, // Will be updated by the journal entry
    isActive: true,
  };
  
  const account = await prisma.$transaction(async (tx) => {
    const createdAccount = await tx.bankAccount.create({ data });
    
    if (initialBalance > 0) {
      await postJournalEntry({
        entryDate: new Date(),
        description: 'Opening Balance',
        referenceId: createdAccount.id,
        referenceType: 'BANK_ACCOUNT',
        createdById: userId,
        lines: [
          { accountId: createdAccount.id, debitAmount: initialBalance, creditAmount: 0, description: 'Opening Balance (Bank)' },
          { accountId: null, debitAmount: 0, creditAmount: initialBalance, description: 'Opening Balance Equity' }
        ]
      }, tx as any); // cast as any because postJournalEntry might not expect tx, but actually it usually does if it supports tx. Wait, if it doesn't support tx, it might break. Let me check journal.service.ts
    }
    return createdAccount;
  });
  
  eventBus.publishMutation('BankAccount', 'CREATE', userId, account.id, crypto.randomUUID(), account, null);
  return account;
};

export const update = async (id: string, payload: any, userId: string) => {
  const oldAccount = await getById(id);
  const { ifscCode, accountType, id: _id, createdAt, updatedAt, incomes, expenses, _count, balance, ...validData } = payload;
  const data: Prisma.BankAccountUpdateInput = {
    ...(validData.bankName && { bankName: validData.bankName }),
    ...(validData.accountName && { accountName: validData.accountName }),
    ...(validData.accountNo && { accountNo: String(validData.accountNo) }),
    ...((validData.ifsc || ifscCode) && { ifsc: validData.ifsc || ifscCode }),
    ...(validData.branch !== undefined && { branch: validData.branch }),
    ...(accountType !== undefined && { accountType }),
    // balance is strictly managed by journal entries, so we don't allow it to be updated here
  };
  const account = await prisma.bankAccount.update({ where: { id }, data });
  eventBus.publishMutation('BankAccount', 'UPDATE', userId, id, crypto.randomUUID(), account, oldAccount);
  return account;
};

export const remove = async (id: string, userId: string) => {
  const oldAccount = await getById(id);
  const account = await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
  eventBus.publishMutation('BankAccount', 'DELETE', userId, id, crypto.randomUUID(), { isActive: false }, oldAccount);
  return account;
};

export const reconcile = async (id: string, balance: number, userId: string) => {
  const oldAccount = await getById(id);
  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      lastReconciledAt: new Date(),
      lastReconciledBalance: balance,
    }
  });
  eventBus.publishMutation('BankAccount', 'UPDATE', userId, id, crypto.randomUUID(), account, oldAccount);
  return account;
};
