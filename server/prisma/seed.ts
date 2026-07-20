import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed with realistic Indian Construction ERP data...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.labourPayment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.labourAssignment.deleteMany();
  await prisma.labour.deleteMany();
  await prisma.materialOrderItem.deleteMany();
  await prisma.materialOrder.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.material.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.siteProgress.deleteMany();
  await prisma.project.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const engineerPassword = await bcrypt.hash('Engineer@123', 12);
  const accountantPassword = await bcrypt.hash('Accountant@123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@vastuconstruction.in',
      password: hashedPassword,
      name: 'Sandeep Jadhav',
      phone: '+91 98200 11223',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const engineer = await prisma.user.create({
    data: {
      email: 'engineer@vastuconstruction.in',
      password: engineerPassword,
      name: 'Vikram Verma',
      phone: '+91 98200 44556',
      role: 'ENGINEER',
      isActive: true,
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@vastuconstruction.in',
      password: accountantPassword,
      name: 'Neha Gupta',
      phone: '+91 98200 77889',
      role: 'ACCOUNTANT',
      isActive: true,
    },
  });

  // Create Employee profiles
  await prisma.employee.createMany({
    data: [
      { userId: admin.id, department: 'Executive', designation: 'Managing Director', salary: 250000, joiningDate: new Date('2020-01-15') },
      { userId: engineer.id, department: 'Engineering', designation: 'Senior Civil Engineer', salary: 85000, joiningDate: new Date('2021-04-10') },
      { userId: accountant.id, department: 'Finance', designation: 'Chief Accountant', salary: 65000, joiningDate: new Date('2021-06-01') },
    ],
  });

  // 3. Create Bank Accounts
  const hdfc = await prisma.bankAccount.create({
    data: {
      bankName: 'HDFC Bank Ltd',
      accountName: 'HDFC Current A/c',
      accountNo: '50200012345678',
      ifsc: 'HDFC0000240',
      branch: 'Andheri West, Mumbai',
      balance: 4500000, // 45 Lakhs
    },
  });

  const sbi = await prisma.bankAccount.create({
    data: {
      bankName: 'State Bank of India',
      accountName: 'SBI Escrow A/c',
      accountNo: '33445566778',
      ifsc: 'SBIN0001234',
      branch: 'MG Road, Pune',
      balance: 2800000, // 28 Lakhs
    },
  });

  // 4. Create Clients
  const client1 = await prisma.client.create({
    data: {
      name: 'Anand Mahindra Group',
      phone: '+91 98111 22334',
      email: 'projects@mahindradev.com',
      companyName: 'Mahindra Lifespaces',
      gst: '27AAACM1234E1Z5',
      address: 'Worli, Mumbai, Maharashtra',
      city: 'Mumbai',
      state: 'Maharashtra',
      createdById: admin.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Suresh Patel',
      phone: '+91 98222 33445',
      email: 'suresh.patel@gmail.com',
      companyName: 'Patel Logistics Hub',
      gst: '24BBBCP5678F1Z2',
      address: 'Navrangpura, Ahmedabad, Gujarat',
      city: 'Ahmedabad',
      state: 'Gujarat',
      createdById: admin.id,
    },
  });

  // 5. Create Projects
  const proj1 = await prisma.project.create({
    data: {
      name: 'Royal Palm Heights - Phase 2',
      clientId: client1.id,
      engineerId: engineer.id,
      status: 'IN_PROGRESS',
      progress: 65,
      contractValue: 145000000, // 14.5 Crores
      startDate: new Date('2024-03-01'),
      expectedCompletion: new Date('2025-12-31'),
      address: 'Plot 42, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      description: 'Luxury G+15 residential tower with high-end amenities.',
      createdById: admin.id,
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      name: 'Sunrise Commercial Park',
      clientId: client2.id,
      engineerId: engineer.id,
      status: 'IN_PROGRESS',
      progress: 35,
      contractValue: 105000000, // 10.5 Crores
      startDate: new Date('2024-08-15'),
      expectedCompletion: new Date('2026-03-31'),
      address: 'Hinjewadi Phase 1',
      city: 'Pune',
      state: 'Maharashtra',
      description: 'Tech park campus building with basement parking.',
      createdById: admin.id,
    },
  });

  // 6. Create Vendors
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Ultratech Cement Agency',
      phone: '+91 99000 11223',
      email: 'sales@ultratechagency.in',
      gst: '27AABCT9988H1Z8',
      address: 'Kalyan Naka, Thane',
      city: 'Thane',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Tata Tiscon Steel Traders',
      phone: '+91 99000 44556',
      email: 'orders@tatasteeltraders.com',
      gst: '27AAABT7766G1Z3',
      address: 'Taloja MIDC, Navi Mumbai',
      city: 'Navi Mumbai',
    },
  });

  // 7. Create Materials & Stock
  const cement = await prisma.material.create({
    data: {
      name: 'Ultratech OPC 53 Grade Cement',
      unit: 'BAGS',
      rate: 385,
      vendorId: vendor1.id,
    },
  });

  const steel = await prisma.material.create({
    data: {
      name: 'Tata Tiscon 550D Rebar 12mm',
      unit: 'TONS',
      rate: 62000,
      vendorId: vendor2.id,
    },
  });

  await prisma.stock.createMany({
    data: [
      { materialId: cement.id, projectId: proj1.id, quantity: 450 },
      { materialId: steel.id, projectId: proj1.id, quantity: 24.5 },
      { materialId: cement.id, projectId: proj2.id, quantity: 210 },
    ],
  });

  // 8. Create Labours
  const labour1 = await prisma.labour.create({
    data: {
      name: 'Ramdas Shinde',
      phone: '+91 88990 11223',
      skill: 'MASON',
      dailyWage: 950,
      address: 'Dharavi Slum Rehab, Mumbai',
    },
  });

  const labour2 = await prisma.labour.create({
    data: {
      name: 'Sanjay Yadav',
      phone: '+91 88990 44556',
      skill: 'HELPER',
      dailyWage: 600,
      address: 'Kurla West, Mumbai',
    },
  });

  // 9. Create Incomes & Expenses
  await prisma.income.createMany({
    data: [
      {
        clientId: client1.id,
        projectId: proj1.id,
        amount: 25000000, // 2.5 Crores
        gstAmount: 4500000,
        paymentDate: new Date('2024-04-10'),
        paymentMethod: 'BANK_TRANSFER',
        accountId: hdfc.id,
        type: 'ADVANCE',
        invoiceNo: 'INV-2024-001',
        reference: 'NEFT-UTIB000123-9988',
        createdById: accountant.id,
      },
      {
        clientId: client2.id,
        projectId: proj2.id,
        amount: 15000000, // 1.5 Crores
        gstAmount: 2700000,
        paymentDate: new Date('2024-09-01'),
        paymentMethod: 'BANK_TRANSFER',
        accountId: sbi.id,
        type: 'RUNNING_BILL',
        invoiceNo: 'INV-2024-002',
        reference: 'RTGS-SBIN000456-1122',
        createdById: accountant.id,
      },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        projectId: proj1.id,
        vendorId: vendor1.id,
        type: 'MATERIAL',
        amount: 1925000, // ~19.25 Lakhs
        gstAmount: 346500,
        paymentDate: new Date('2024-04-20'),
        paymentMethod: 'BANK_TRANSFER',
        accountId: hdfc.id,
        description: 'Purchase of 5000 bags of cement for Plinth level work.',
        createdById: accountant.id,
      },
      {
        projectId: proj1.id,
        type: 'LABOUR',
        amount: 485000,
        paymentDate: new Date('2024-05-01'),
        paymentMethod: 'CASH',
        description: 'Weekly wages disbursement for 35 workers at Bandra site.',
        createdById: engineer.id,
      },
    ],
  });

  // 10. Create Site Progress & Tasks
  await prisma.siteProgress.create({
    data: {
      projectId: proj1.id,
      title: '7th Floor Slab Casting Completed',
      description: 'Concreting of 7th floor slab finished successfully without any delays. Weather conditions were favorable.',
      progress: 70,
      photos: [],
      createdById: engineer.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Safety inspection & scaffolding verification for 8th floor',
        description: 'Conduct thorough load test on scaffolding before shuttering work begins.',
        projectId: proj1.id,
        assigneeId: engineer.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Reconciliation of GST input tax credit for Q2',
        description: 'Verify GSTR-2B with vendor invoices and submit discrepancy report.',
        assigneeId: accountant.id,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
