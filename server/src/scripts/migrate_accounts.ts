import { prisma } from '../config/database.js';

async function main() {
  console.log('Starting account migration...');
  
  // 1. Get or create a default bank account
  let defaultAccount = await prisma.bankAccount.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!defaultAccount) {
    console.log('No active bank account found. Creating a default one...');
    defaultAccount = await prisma.bankAccount.create({
      data: {
        bankName: 'Main Corporate Bank',
        accountName: 'Main Corporate Account',
        accountNo: 'CORP-' + Date.now(),
        accountType: 'BANK',
        isActive: true,
        openingBalance: 0,
        balance: 0,
      }
    });
  }

  console.log(`Using default account: ${defaultAccount.accountName} (${defaultAccount.id})`);

  // 2. Assign default account to Expenses and Incomes with null accountId
  const expensesUpdate = await prisma.expense.updateMany({
    where: { accountId: null },
    data: { accountId: defaultAccount.id }
  });
  console.log(`Updated ${expensesUpdate.count} expenses.`);

  const incomesUpdate = await prisma.income.updateMany({
    where: { accountId: null },
    data: { accountId: defaultAccount.id }
  });
  console.log(`Updated ${incomesUpdate.count} incomes.`);

  // 3. Recalculate balance for all bank accounts
  const allAccounts = await prisma.bankAccount.findMany();
  for (const account of allAccounts) {
    const expenses = await prisma.expense.aggregate({
      where: { accountId: account.id, deletedAt: null },
      _sum: { amount: true, gstAmount: true }
    });
    
    const incomes = await prisma.income.aggregate({
      where: { accountId: account.id, deletedAt: null },
      _sum: { amount: true, gstAmount: true }
    });

    const expAmt = Number(expenses._sum.amount || 0) + Number(expenses._sum.gstAmount || 0);
    const incAmt = Number(incomes._sum.amount || 0) + Number(incomes._sum.gstAmount || 0);
    const newBalance = Number(account.openingBalance) + incAmt - expAmt;

    await prisma.bankAccount.update({
      where: { id: account.id },
      data: { balance: newBalance }
    });
    console.log(`Recalculated balance for account ${account.accountName}: ${newBalance}`);
  }

  console.log('Migration completed successfully.');
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
