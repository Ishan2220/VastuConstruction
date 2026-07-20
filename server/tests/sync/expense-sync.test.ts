import { PrismaClient } from '@prisma/client';
import { getAdminDashboard } from '../../src/services/dashboard.service.js';
import { create as createExpense } from '../../src/services/expense.service.js';
import { eventBus } from '../../src/events/EventBus.js';
import assert from 'assert';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Starting Automated Sync Tests ---');
  
  // 1. Get initial dashboard state
  const initialDashboard = await getAdminDashboard();
  const initialExpense = initialDashboard.kpis.monthlyExpense;
  const initialProfit = initialDashboard.kpis.profit;

  // 2. Create a dummy user
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found to run tests');

  // 3. Create an expense (Mutation)
  const testAmount = 5000;
  console.log(`[TEST] Creating Expense for amount: ${testAmount}`);
  const expense = await createExpense({
    amount: testAmount,
    type: 'MATERIAL',
    paymentDate: new Date(),
    paymentMethod: 'CASH',
  }, user.id);

  // 4. Give the EventBus a moment to process side effects asynchronously
  await new Promise(resolve => setTimeout(resolve, 500));

  // 5. Verify the dashboard state
  const finalDashboard = await getAdminDashboard();
  const finalExpense = finalDashboard.kpis.monthlyExpense;
  const finalProfit = finalDashboard.kpis.profit;

  console.log(`Initial Expense: ${initialExpense}, Final Expense: ${finalExpense}`);
  assert.strictEqual(
    Number(finalExpense), 
    Number(initialExpense) + testAmount,
    'Dashboard Total Expenses did not increment correctly!'
  );

  console.log(`Initial Profit: ${initialProfit}, Final Profit: ${finalProfit}`);
  assert.strictEqual(
    Number(finalProfit),
    Number(initialProfit) - testAmount,
    'Dashboard Overall Profit did not decrement correctly!'
  );

  // 6. Cleanup
  console.log('[TEST] Cleaning up test data...');
  await prisma.expense.delete({ where: { id: expense.id } });
  
  console.log('✅ All Sync Tests Passed Successfully!');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
