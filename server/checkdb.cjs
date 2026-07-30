const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exps = await prisma.expense.findMany({ take: 2, orderBy: { createdAt: 'desc' } });
  console.log('Expenses:', JSON.stringify(exps, null, 2));

  const incs = await prisma.income.findMany({ take: 2, orderBy: { createdAt: 'desc' } });
  console.log('Incomes:', JSON.stringify(incs, null, 2));
}

main().finally(() => process.exit(0));
