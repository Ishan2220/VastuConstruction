const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany({});
  
  // also verify if there is an employee payment table
  if (prisma.employeePayment) {
     await prisma.employeePayment.deleteMany({});
  }
  if (prisma.salaryAdvance) {
     await prisma.salaryAdvance.deleteMany({});
  }

  console.log('Audit logs and payments cleared.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
