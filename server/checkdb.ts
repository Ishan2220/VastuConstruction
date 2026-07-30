import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const exps = await prisma.expense.findMany({ take: 2, orderBy: { createdAt: 'desc' } });
  console.log('EXP', exps);
}
main().finally(() => process.exit(0));
