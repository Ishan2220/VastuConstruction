import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillLedger() {
  console.log('--- Starting Ledger Backfill Migration ---');

  // 1. Backfill Bank Accounts Opening Balances
  // For safety, we assume current balance is the opening balance if no ledger entries exist.
  await prisma.bankAccount.updateMany({
    data: { accountType: 'BANK' },
    where: { accountType: { equals: 'BANK' } } // Touch them to ensure default applies
  });
  
  // Fix Cash accounts based on string matching (one-time migration)
  await prisma.bankAccount.updateMany({
    where: { bankName: { contains: 'Cash', mode: 'insensitive' } },
    data: { accountType: 'CASH' }
  });

  const accounts = await prisma.bankAccount.findMany();
  for (const acc of accounts) {
    if (Number(acc.openingBalance) === 0 && Number(acc.balance) !== 0) {
      await prisma.bankAccount.update({
        where: { id: acc.id },
        data: { openingBalance: acc.balance }
      });
    }
  }

  // 2. Backfill Incomes
  const incomes = await prisma.income.findMany();
  for (const inc of incomes) {
    const existing = await prisma.journalEntry.findFirst({ where: { referenceId: inc.id } });
    if (!existing) {
      const entry = await prisma.journalEntry.create({
        data: {
          entryDate: inc.paymentDate,
          description: `Income recorded: ${inc.notes || inc.type}`,
          referenceId: inc.id,
          referenceType: 'INCOME',
          createdById: inc.createdById,
        }
      });
      
      const totalAmt = Number(inc.amount) + Number(inc.gstAmount);

      // Debit Bank (money in)
      if (inc.accountId) {
        await prisma.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: inc.accountId,
            debitAmount: totalAmt,
            creditAmount: 0,
            description: 'Income deposit'
          }
        });
      }

      // Credit Revenue Account (virtual account for now, left accountId null means general revenue)
      await prisma.journalLine.create({
        data: {
          journalEntryId: entry.id,
          accountId: null, // Generic revenue
          debitAmount: 0,
          creditAmount: totalAmt,
          description: 'Revenue recognition'
        }
      });
    }
  }

  // 3. Backfill Expenses
  const expenses = await prisma.expense.findMany();
  for (const exp of expenses) {
    const existing = await prisma.journalEntry.findFirst({ where: { referenceId: exp.id } });
    if (!existing) {
      const entry = await prisma.journalEntry.create({
        data: {
          entryDate: exp.paymentDate,
          description: `Expense recorded: ${exp.description || exp.type}`,
          referenceId: exp.id,
          referenceType: 'EXPENSE',
          createdById: exp.createdById,
        }
      });
      
      const totalAmt = Number(exp.amount) + Number(exp.gstAmount);

      // Debit Expense Account
      await prisma.journalLine.create({
        data: {
          journalEntryId: entry.id,
          accountId: null,
          debitAmount: totalAmt,
          creditAmount: 0,
          description: 'Expense recognition'
        }
      });

      // Credit Bank (money out)
      if (exp.accountId) {
        await prisma.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: exp.accountId,
            debitAmount: 0,
            creditAmount: totalAmt,
            description: 'Expense payment'
          }
        });
      }
    }
  }

  console.log('✅ Ledger Backfill Complete!');
}

backfillLedger()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
