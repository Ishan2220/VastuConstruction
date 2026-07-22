import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

import { FinancialService } from './financial.service.js';

const getDateRange = (months: number) => {
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
};

export const getAdminDashboard = async () => {
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
  const { start: todayStart, end: todayEnd } = getTodayRange();

  // 1. Get Financial Summary from Central Service
  const financialSummary = await FinancialService.getFinancialSummary();

  const [
    leadCount,
    activeProjectCount,
    activeSiteCount,
    totalClients,
    recentLeads,
    activeSites,
    expenseByCategory,
    topMaterialPurchases,
    paymentModeSummary,
    recentActivities,
    todayTasks,
    upcomingReminders,
    totalLabour,
  ] = await Promise.all([
    // Lead count
    prisma.lead.count({ where: { deletedAt: null } }),

    // Active projects
    prisma.project.count({
      where: { deletedAt: null, status: { in: ['IN_PROGRESS', 'PLANNING'] } },
    }),

    // Active sites (IN_PROGRESS projects)
    prisma.project.count({
      where: { deletedAt: null, status: 'IN_PROGRESS' },
    }),

    // Total clients
    prisma.client.count({ where: { deletedAt: null } }),

    // Recent leads
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, name: true, status: true, source: true,
        budget: true, createdAt: true, phone: true,
      },
    }),

    // Active sites with progress
    prisma.project.findMany({
      where: { deletedAt: null, status: 'IN_PROGRESS' },
      select: {
        id: true, name: true, progress: true, city: true,
        client: { select: { name: true } },
        engineer: { select: { name: true } },
        contractValue: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    // Expense by category (current month)
    prisma.expense.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Top material purchases (current month)
    prisma.materialOrderItem.findMany({
      where: {
        order: {
          orderDate: { gte: monthStart, lte: monthEnd },
        },
      },
      include: {
        material: { select: { name: true, unit: true } },
      },
      orderBy: { amount: 'desc' },
      take: 10,
    }),

    // Payment mode summary (current month income)
    prisma.income.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Recent audit logs as activities
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true } },
      },
    }),

    // Today's tasks
    prisma.task.findMany({
      where: {
        dueDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        assignee: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { priority: 'desc' },
    }),

    // Upcoming reminders (calendar events in next 7 days)
    prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        isCompleted: false,
      },
      orderBy: { startTime: 'asc' },
      take: 10,
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),

    // Total active labour
    prisma.labour.count({ where: { deletedAt: null, isActive: true } }),
  ]);

  const [vendorMonthAgg, labourMonthAgg, salaryMonthAgg] = await Promise.all([
    prisma.vendorPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: monthStart, lte: monthEnd } } }),
    prisma.labourPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: monthStart, lte: monthEnd } } }),
    prisma.salaryPayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: monthStart, lte: monthEnd } } }),
  ]);

  if (Number(vendorMonthAgg._sum.amount) > 0) expenseByCategory.push({ type: 'VENDOR', _sum: { amount: vendorMonthAgg._sum.amount as any } } as any);
  if (Number(labourMonthAgg._sum.amount) > 0) expenseByCategory.push({ type: 'LABOUR', _sum: { amount: labourMonthAgg._sum.amount as any } } as any);
  if (Number(salaryMonthAgg._sum.amount) > 0) expenseByCategory.push({ type: 'SALARY', _sum: { amount: salaryMonthAgg._sum.amount as any } } as any);

  // Site-wise P/L
  const siteWisePL = await prisma.project.findMany({
    where: { deletedAt: null, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    select: {
      id: true,
      name: true,
      contractValue: true,
      incomes: { select: { amount: true } },
      expenses: { select: { amount: true } },
    },
  });

  const siteWiseData = siteWisePL.map((project) => {
    const totalIncome = project.incomes.reduce(
      (sum, i) => sum.add(i.amount), new Prisma.Decimal(0)
    );
    const totalExpense = project.expenses.reduce(
      (sum, e) => sum.add(e.amount), new Prisma.Decimal(0)
    );
    return {
      id: project.id,
      name: project.name,
      contractValue: project.contractValue,
      totalIncome,
      totalExpense,
      profit: totalIncome.sub(totalExpense),
    };
  });

  const allClientsFinancials = await prisma.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      companyName: true,
      invoices: { where: { status: { not: 'CANCELLED' } }, select: { totalAmount: true } },
      incomes: { select: { amount: true } }
    }
  });

  const topOutstandingClients = allClientsFinancials.map(client => {
    const totalBilled = client.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = client.incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    return {
      id: client.id,
      name: client.name,
      companyName: client.companyName,
      outstanding: totalBilled - totalPaid,
    };
  }).filter(c => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  return {
    kpis: {
      leadCount,
      activeProjectCount,
      activeSiteCount,
      totalClients,
      totalLabour,
      monthlyIncome: financialSummary.monthlyIncome,
      monthlyExpense: financialSummary.monthlyExpenses,
      profit: financialSummary.profit,
      cashInHand: financialSummary.cashInHand,
      bankBalance: financialSummary.bankBalance,
      clientReceivable: financialSummary.clientReceivable,
      vendorPayable: financialSummary.vendorPayable,
    },
    activeSites,
    siteWisePL: siteWiseData,
    expenseByCategory,
    topMaterialPurchases,
    paymentModeSummary,
    recentActivities,
    todayTasks,
    recentLeads,
    upcomingReminders,
    topOutstandingClients,
  };
};

export const getEngineerDashboard = async (userId: string) => {
  const { start: todayStart, end: todayEnd } = getTodayRange();

  const [
    assignedProjects,
    myTasks,
    todayTasks,
    upcomingEvents,
    recentProgress,
  ] = await Promise.all([
    // Assigned projects
    prisma.project.findMany({
      where: { engineerId: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        city: true,
        client: { select: { name: true } },
        contractValue: true,
        startDate: true,
        expectedCompletion: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // My pending tasks
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 20,
    }),

    // Today's tasks
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        project: { select: { name: true } },
      },
    }),

    // Upcoming calendar events
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        isCompleted: false,
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),

    // Recent site progress
    prisma.siteProgress.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        project: { select: { name: true } },
      },
    }),
  ]);

  const activeProjectCount = assignedProjects.filter(
    (p) => p.status === 'IN_PROGRESS'
  ).length;

  return {
    kpis: {
      totalAssigned: assignedProjects.length,
      activeProjectCount,
      pendingTasks: myTasks.length,
      todayTaskCount: todayTasks.length,
    },
    assignedProjects,
    myTasks,
    todayTasks,
    upcomingEvents,
    recentProgress,
  };
};
