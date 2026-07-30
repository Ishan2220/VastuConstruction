import { prisma } from '../config/database.js';

interface ReportParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

export const getFinancialSummary = async (params: ReportParams) => {
  const { startDate, endDate, projectId } = params;
  let dateFilter: any = undefined;
  if (startDate || endDate) {
    dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      dateFilter.lte = eDate;
    }
  }

  const [incomes, expenses, vendorPayments, labourPayments, salaryPayments] = await Promise.all([
    prisma.income.findMany({
      where: { deletedAt: null, ...(dateFilter && { paymentDate: dateFilter }), ...(projectId && { projectId }) },
      include: { project: { select: { name: true } }, client: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, ...(dateFilter && { paymentDate: dateFilter }), ...(projectId && { projectId }) },
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

  const totalIncome = incomes.reduce((acc: number, curr: any) => acc + Number(curr.amount) + Number(curr.gstAmount || 0), 0);
  const baseExpense = expenses.reduce((acc: number, curr: any) => acc + Number(curr.amount) + Number(curr.gstAmount || 0), 0);
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

  const mergedExpenses = [
    ...expenses,
    ...vendorPayments.map(vp => ({ id: vp.id, paymentDate: vp.paymentDate, type: 'VENDOR_PAYMENT', amount: vp.amount, notes: vp.reference })),
    ...labourPayments.map(lp => ({ id: lp.id, paymentDate: lp.paymentDate, type: 'LABOUR_PAYMENT', amount: lp.amount, notes: lp.notes })),
    ...salaryPayments.map(sp => ({ id: sp.id, paymentDate: sp.paymentDate, type: 'SALARY', amount: sp.amount, notes: sp.reference }))
  ];

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
    expenses: mergedExpenses,
  };
};

export const getProjectReport = async () => {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      client: { select: { name: true } },
      incomes: { where: { deletedAt: null }, select: { amount: true } },
      expenses: { where: { deletedAt: null }, select: { amount: true } },
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
      clientName: p.client?.name || 'Unknown',
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
