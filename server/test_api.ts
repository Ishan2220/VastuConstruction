import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const exps = await prisma.expense.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Expenses:", JSON.stringify(exps, null, 2));
  
  const agg = await prisma.expense.aggregate({
    _sum: { amount: true },
  });
  console.log("Total Expense Amount:", agg._sum.amount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
