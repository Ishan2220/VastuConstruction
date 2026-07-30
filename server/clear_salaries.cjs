const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (prisma.salaryPayment) {
    await prisma.salaryPayment.deleteMany({});
    console.log('Salary payments cleared.');
  } else {
    console.log('No SalaryPayment table found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
