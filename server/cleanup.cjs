const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data flush (keeping Users, Employees, Settings)...');

  // We need to delete in reverse order of dependencies to avoid foreign key constraints.
  
  // 1. Finance & Accounting
  console.log('Deleting financial records...');
  await prisma.journalEntry.deleteMany({});
  await prisma.income.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.vendorPaymentDetail.deleteMany({});
  await prisma.vendorPayment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});

  // 2. Materials & Stock
  console.log('Deleting materials and stock...');
  await prisma.materialOrderItem.deleteMany({});
  await prisma.materialOrder.deleteMany({});
  await prisma.materialConsumption.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.projectMaterialRequirement.deleteMany({});
  await prisma.material.deleteMany({});

  // 3. Payroll & Labour
  console.log('Deleting payroll and labour records...');
  await prisma.payrollAdjustment.deleteMany({});
  await prisma.payrollHistory.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.dailyWorkLog.deleteMany({});
  await prisma.unifiedAttendance.deleteMany({});
  await prisma.vendorAttendanceDetail.deleteMany({});
  await prisma.vendorAttendance.deleteMany({});
  await prisma.labourPayment.deleteMany({});
  await prisma.labourAssignment.deleteMany({});
  await prisma.labour.deleteMany({});
  await prisma.vendorLabourRate.deleteMany({});
  await prisma.labourCategory.deleteMany({});

  // 4. Project specifics
  console.log('Deleting project records...');
  await prisma.siteProgress.deleteMany({});
  await prisma.projectTimeline.deleteMany({});
  await prisma.drawing.deleteMany({});
  await prisma.projectMilestone.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  
  // 5. CRM & Activities
  console.log('Deleting CRM and activities...');
  await prisma.businessActivity.deleteMany({});
  await prisma.approvalStep.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.clientNote.deleteMany({});
  await prisma.leadTimeline.deleteMany({});
  
  // 6. Core entities
  console.log('Deleting Core entities (Leads, Projects, Clients, Vendors, Bank Accounts)...');
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.bankAccount.deleteMany({});

  console.log('Database flushed successfully. Retained Users and Employees.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
