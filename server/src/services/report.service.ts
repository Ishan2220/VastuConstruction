import { prisma } from '../config/database.js';

interface ReportParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

export const getFinancialSummary = async (params: ReportParams) => {
  const { startDate, endDate, projectId } = params;
  const dateFilter = startDate && endDate ? { gte: new Date(startDate), lte: new Date(endDate) } : undefined;

  const [incomes, expenses, vendorPayments, labourPayments, salaryPayments] = await Promise.all([
    prisma.income.findMany({
      where: { ...(dateFilter && { paymentDate: dateFilter }), ...(projectId && { projectId }) },
      include: { project: { select: { name: true } }, client: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { ...(dateFilter && { paymentDate: dateFilter }), ...(projectId && { projectId }) },
      include: { project: { select: { name: true } }, vendor: { select: { name: true } } },
    }),
    prisma.vendorPayment.findMany({
      where: { ...(dateFilter && { paymentDate: dateFilter }) },
    }),
    prisma.labourPayment.findMany({
      where: { ...(dateFilter && { paymentDate: dateFilter }) },
    }),
    prisma.salaryPayment.findMany({
      where: { ...(dateFilter && { paymentDate: dateFilter }) },
    }),
  ]);

  const totalIncome = incomes.reduce((acc: number, curr: { amount: unknown }) => acc + Number(curr.amount), 0);
  const baseExpense = expenses.reduce((acc: number, curr: { amount: unknown }) => acc + Number(curr.amount), 0);
  const totalVendorPayments = vendorPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalLabourPayments = labourPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalSalaryPayments = salaryPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  const totalExpense = baseExpense + totalVendorPayments + totalLabourPayments + totalSalaryPayments;
  const totalGstCollected = incomes.reduce((acc: number, curr: { gstAmount?: unknown }) => acc + Number(curr.gstAmount || 0), 0);
  const totalGstPaid = expenses.reduce((acc: number, curr: { gstAmount?: unknown }) => acc + Number(curr.gstAmount || 0), 0);

  // Group by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e: { type: string; amount: unknown }) => {
    expenseByCategory[e.type] = (expenseByCategory[e.type] || 0) + Number(e.amount);
  });

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    gstSummary: {
      collected: totalGstCollected,
      paid: totalGstPaid,
      netPayable: totalGstCollected - totalGstPaid,
    },
    expenseByCategory,
    incomes,
    expenses,
  };
};

export const getProjectReport = async () => {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      client: { select: { name: true } },
      incomes: { select: { amount: true } },
      expenses: { select: { amount: true } },
      _count: { select: { tasks: true, siteProgress: true } },
    },
  });

  return projects.map((p: {
    id: string;
    name: string;
    client: { name: string };
    status: string;
    progress: number;
    contractValue?: unknown;
    incomes: Array<{ amount: unknown }>;
    expenses: Array<{ amount: unknown }>;
    _count: { tasks: number; siteProgress: number };
  }) => {
    const totalIncome = p.incomes.reduce((acc: number, i: { amount: unknown }) => acc + Number(i.amount), 0);
    const totalExpense = p.expenses.reduce((acc: number, e: { amount: unknown }) => acc + Number(e.amount), 0);
    return {
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      status: p.status,
      progress: p.progress,
      contractValue: Number(p.contractValue || 0),
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      taskCount: p._count.tasks,
      progressUpdatesCount: p._count.siteProgress,
    };
  });
};
