import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration v2...');

  // 1. Update existing expenses: set isPersonal = false
  const expensesUpdate = await prisma.expense.updateMany({
    where: { isPersonal: { equals: undefined } }, // Just in case, update all
    data: { isPersonal: false },
  });
  console.log(`Updated ${expensesUpdate.count} expenses with isPersonal = false.`);

  // 2. Update existing invoices: set type = 'CLIENT'
  const invoicesUpdate = await prisma.invoice.updateMany({
    where: { type: { equals: undefined } }, // Just in case, update all
    data: { type: 'CLIENT' },
  });
  console.log(`Updated ${invoicesUpdate.count} invoices with type = 'CLIENT'.`);

  // 3. Update BankAccounts: set initial balance to openingBalance if balance is 0?
  // Actually, balance calculation will be handled by the reconciliation service,
  // but we can initialize them just in case.
  const accounts = await prisma.bankAccount.findMany();
  let accountsUpdated = 0;
  for (const account of accounts) {
    if (account.balance.toNumber() === 0 && account.openingBalance.toNumber() !== 0) {
      await prisma.bankAccount.update({
        where: { id: account.id },
        data: { balance: account.openingBalance },
      });
      accountsUpdated++;
    }
  }
  console.log(`Updated ${accountsUpdated} bank accounts with initial balance.`);

  // 4. Any existing materials could be marked as default if they match specific names
  const defaultNames = ['Cement', 'Sand', 'Steel', 'Bricks', 'Gravel', 'Tiles', 'Paint'];
  const materialsUpdate = await prisma.material.updateMany({
    where: { name: { in: defaultNames } },
    data: { isDefault: true },
  });
  console.log(`Marked ${materialsUpdate.count} materials as default.`);

  console.log('Data migration v2 completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
