import { prisma } from '../config/database.js';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { randomUUID } from 'crypto';

export interface JournalLineData {
  accountId: string | null;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export const postJournalEntry = async (
  data: {
    entryDate: Date;
    description: string;
    referenceId?: string;
    referenceType?: string;
    createdById?: string;
    lines: JournalLineData[];
  },
  tx?: Prisma.TransactionClient
) => {
  // Validate double-entry logic
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new ApiError(400, `Journal Entry unbalanced! Debits: ${totalDebit}, Credits: ${totalCredit}`);
  }

  const db = tx || prisma;

  const entry = await db.journalEntry.create({
    data: {
      entryDate: data.entryDate,
      description: data.description,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      createdById: data.createdById,
      lines: {
        create: data.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          description: line.description,
        })),
      },
    },
    include: { lines: true },
  });

  // Update Cached Balances on BankAccounts
  for (const line of data.lines) {
    if (line.accountId) {
      // In Accounting, for a Bank Asset account: Debit increases balance, Credit decreases balance
      await db.bankAccount.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: Number(line.debitAmount) - Number(line.creditAmount)
          }
        }
      });
    }
  }

  // Publish audit log for this generic Ledger Entry if createdById is present
  if (data.createdById) {
    eventBus.publishMutation('JournalEntry', 'CREATE', data.createdById, entry.id, randomUUID(), entry, null);
  }

  return entry;
};

/**
 * Reverses an existing journal entry. Used instead of deleting financial records.
 */
export const reverseJournalEntry = async (referenceId: string, createdById: string, reason: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;
  
  const originalEntry = await db.journalEntry.findFirst({
    where: { referenceId, referenceType: { not: 'REVERSAL' } },
    include: { lines: true }
  });

  if (!originalEntry) {
    // Legacy records might not have a journal entry. Do not block deletion.
    return null;
  }

  // Swap debits and credits
  const reversalLines = originalEntry.lines.map(line => ({
    accountId: line.accountId,
    debitAmount: Number(line.creditAmount),
    creditAmount: Number(line.debitAmount),
    description: `Reversal: ${line.description || reason}`
  }));

  return postJournalEntry({
    entryDate: new Date(),
    description: `Reversal of Entry ${originalEntry.id} - ${reason}`,
    referenceId,
    referenceType: 'REVERSAL',
    createdById,
    lines: reversalLines
  }, db);
};
