import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/database.js';
import { create as createExpense } from '../../src/services/expense.service.js';
import { create as createIncome } from '../../src/services/income.service.js';
import { FinancialService } from '../../src/services/financial.service.js';
import { randomUUID } from 'crypto';

describe('End-to-End Financial Reconciliation & Idempotency', () => {
  let clientId: string;
  let projectId: string;
  let bankAccountId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: 'password',
        name: 'Test Accountant',
        role: 'ACCOUNTANT'
      }
    });
    userId = user.id;

    const client = await prisma.client.create({
      data: {
        name: 'Test Client',
        phone: '9999999999',
        createdById: userId
      }
    });
    clientId = client.id;

    const project = await prisma.project.create({
      data: {
        name: 'Reconciliation Project',
        clientId: client.id,
        contractValue: 100000,
        status: 'IN_PROGRESS',
        createdById: userId
      }
    });
    projectId = project.id;

    const bankAccount = await prisma.bankAccount.create({
      data: {
        bankName: 'Test Bank',
        accountName: 'Test Corp',
        accountNo: `ACC-${Date.now()}`,
        accountType: 'BANK',
        openingBalance: 50000,
        balance: 50000 // initial snapshot
      }
    });
    bankAccountId = bankAccount.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.income.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('should perfectly reconcile Income with GST to Bank Balance and Profit', async () => {
    const initialBank = await FinancialService.calculateBankBalance();
    const initialProfit = await FinancialService.calculateProfit();
    const initialReceivable = await FinancialService.calculateClientReceivable();

    // Create Income: 10,000 + 1,800 GST
    await createIncome({
      clientId,
      projectId,
      amount: 10000,
      gstAmount: 1800,
      paymentDate: new Date(),
      paymentMethod: 'UPI',
      accountId: bankAccountId,
      type: 'RUNNING_BILL',
      notes: 'Test Income',
      createdById: userId
    }, userId);

    const newBank = await FinancialService.calculateBankBalance();
    const newProfit = await FinancialService.calculateProfit();
    const newReceivable = await FinancialService.calculateClientReceivable();

    // Bank should increase by total cash movement (11,800)
    expect(newBank - initialBank).toBe(11800);
    
    // Profit should increase by base amount? 
    // Wait, in our current calculateMonthlyIncome, we sum(amount), so yes!
    expect(newProfit - initialProfit).toBe(10000);

    // Receivable should drop by base amount?
    // Wait, client receivable currently subtracts SUM(amount) in raw SQL, so yes.
    expect(initialReceivable - newReceivable).toBe(10000);
  });

  it('should perfectly reconcile Expense with GST to Bank Balance and Profit', async () => {
    const initialBank = await FinancialService.calculateBankBalance();
    const initialProfit = await FinancialService.calculateProfit();

    // Create Expense: 5,000 + 900 GST
    await createExpense({
      projectId,
      type: 'MATERIAL',
      amount: 5000,
      gstAmount: 900,
      paymentDate: new Date(),
      paymentMethod: 'NEFT',
      accountId: bankAccountId,
      description: 'Test Material',
      createdById: userId
    }, userId);

    const newBank = await FinancialService.calculateBankBalance();
    const newProfit = await FinancialService.calculateProfit();

    // Bank should decrease by total cash movement (5,900)
    expect(initialBank - newBank).toBe(5900);
    
    // Profit should decrease by base amount
    expect(initialProfit - newProfit).toBe(5000);
  });
  
  it('should enforce idempotency and not duplicate Journal Entries', async () => {
    const eventIdempotencyKey = randomUUID();
    const { SynchronizationEngine } = await import('../../src/events/SynchronizationEngine.js');
    
    // Process once
    await SynchronizationEngine.handleEntityMutation('CREATE', 'TestEntity', {
      idempotencyKey: eventIdempotencyKey,
      entityId: '123',
      userId
    });

    // Attempt duplicate
    await SynchronizationEngine.handleEntityMutation('CREATE', 'TestEntity', {
      idempotencyKey: eventIdempotencyKey, // SAME KEY
      entityId: '123',
      userId
    });

    const entries = await prisma.eventIdempotency.findMany({
      where: { idempotencyKey: eventIdempotencyKey }
    });

    // Should only be exactly ONE record in the database
    expect(entries.length).toBe(1);
  });
});
