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

export const getDashboardKPIs = async () => {
  const financialSummary = await FinancialService.getFinancialSummary();
  const [totalLeads, activeProjects, activeSites] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { deletedAt: null, status: { in: ['IN_PROGRESS', 'PLANNING'] } } }),
    prisma.project.count({ where: { deletedAt: null, status: 'IN_PROGRESS' } }),
  ]);

  // Use all-time totals for the dashboard
  const totalIncome = await FinancialService.calculateMonthlyIncome();
  const totalExpenses = await FinancialService.calculateMonthlyExpenses();

  return {
    totalLeads,
    activeProjects,
    activeSites,
    incomeThisMonth: totalIncome, // Renamed to keep frontend compatible, but actually total
    expensesThisMonth: totalExpenses, // Renamed to keep frontend compatible, but actually total
    cashInHand: financialSummary.cashInHand,
    bankBalance: financialSummary.bankBalance,
    clientReceivable: financialSummary.clientReceivable,
    vendorPayable: financialSummary.vendorPayable,
    overallProfit: financialSummary.profit
  };
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
    upcomingTasks,
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
        id: true, name: true, city: true, state: true,
        client: { select: { name: true } },
        engineer: { select: { name: true } },
        contractValue: true,
        progress: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),

    // Expense by category (current month)
    prisma.expense.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        deletedAt: null,
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

    // Payment mode summary (All time income)
    prisma.income.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
      where: { deletedAt: null },
    }),

    // Recent business activities
    prisma.businessActivity.findMany({
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } }
      },
    }),

    // Today's tasks (or pending recent tasks)
    prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
      },
      include: {
        assignee: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
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

    // Upcoming Tasks (next 7 days)
    prisma.task.findMany({
      where: {
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { not: 'COMPLETED' },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: { project: { select: { name: true } } }
    }),

    // Total active labour
    prisma.labour.count({ where: { deletedAt: null, isActive: true } }),
  ]);

  // Site-wise P/L (Raw query to prevent OOM)
  const siteWiseRaw = await prisma.$queryRaw`
    SELECT 
      p.id, 
      p.name, 
      p.contract_value AS "contractValue",
      COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.project_id = p.id AND i.deleted_at IS NULL), 0) AS "totalIncome",
      COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.project_id = p.id AND e.deleted_at IS NULL), 0) AS "totalExpense"
    FROM projects p
    WHERE p.deleted_at IS NULL AND p.status IN ('IN_PROGRESS', 'COMPLETED')
  `;

  const siteWiseData = (siteWiseRaw as any[]).map((project) => {
    const totalIncome = new Prisma.Decimal(project.totalIncome || 0);
    const totalExpense = new Prisma.Decimal(project.totalExpense || 0);
    return {
      id: project.id,
      name: project.name,
      contractValue: new Prisma.Decimal(project.contractValue || 0),
      totalIncome,
      totalExpense,
      profit: totalIncome.sub(totalExpense),
    };
  });

  // Top Outstanding Clients (Raw query to prevent OOM)
  const topOutstandingClientsRaw = await prisma.$queryRaw`
    SELECT 
      c.id, 
      c.name, 
      c.company_name AS "companyName",
      COALESCE((SELECT SUM(contract_value) FROM projects p WHERE p.client_id = c.id AND p.deleted_at IS NULL), 0) -
      COALESCE((SELECT SUM(amount) FROM incomes i WHERE i.client_id = c.id AND i.deleted_at IS NULL), 0) AS outstanding
    FROM clients c
    WHERE c.deleted_at IS NULL
    ORDER BY outstanding DESC
    LIMIT 5
  `;

  const topOutstandingClients = (topOutstandingClientsRaw as any[])
    .filter(c => Number(c.outstanding) > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      outstanding: Number(c.outstanding)
    }));

  // Merge calendar events and upcoming tasks into upcomingReminders
  const mergedReminders = [
    ...upcomingReminders.map((r: any) => ({ id: r.id, title: r.title, startTime: r.startTime, type: 'Meeting' })),
    ...upcomingTasks.map((t: any) => ({ id: t.id, title: t.title, startTime: t.dueDate, type: 'Task' }))
  ].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 10);

  const computedActiveSites = activeSites.map(site => ({
    id: site.id,
    name: site.name,
    location: `${site.city || ''}, ${site.state || ''}`.replace(/^, | , $/g, ''),
    progress: site.progress || 0
  }));

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
    activeSites: computedActiveSites,
    siteWisePL: siteWiseData,
    expenseByCategory,
    topMaterialPurchases,
    paymentModeSummary,
    recentActivities,
    todayTasks,
    recentLeads,
    upcomingReminders: mergedReminders,
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

export const getTodayActivities = async () => {
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [expenses, incomes, clients, leads, tasks] = await Promise.all([
    prisma.expense.findMany({
      where: { deletedAt: null, createdAt: { gte: today } },
      include: { vendor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.income.findMany({
      where: { deletedAt: null, createdAt: { gte: today } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.client.findMany({
      where: { createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.lead.findMany({
      where: { updatedAt: { gte: today } },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.task.findMany({
      where: { updatedAt: { gte: today }, status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  const activities: any[] = [];

  expenses.forEach(e => {
    activities.push({
      id: `exp-${e.id}`,
      type: 'EXPENSE',
      title: `Logged Expense: ${e.description}`,
      amount: e.amount,
      time: e.createdAt,
      icon: 'receipt'
    });
  });

  incomes.forEach(i => {
    activities.push({
      id: `inc-${i.id}`,
      type: 'INCOME',
      title: `Payment Received from ${i.client?.name || 'Client'}`,
      amount: i.amount,
      time: i.createdAt,
      icon: 'arrow-down'
    });
  });

  clients.forEach(c => {
    activities.push({
      id: `cli-${c.id}`,
      type: 'CLIENT',
      title: `New Client Registered: ${c.name}`,
      time: c.createdAt,
      icon: 'users'
    });
  });

  leads.forEach(l => {
    activities.push({
      id: `lead-${l.id}`,
      type: 'LEAD',
      title: `Lead Updated: ${l.name} (${l.status})`,
      time: l.updatedAt,
      icon: 'user-plus'
    });
  });

  tasks.forEach(t => {
    activities.push({
      id: `task-${t.id}`,
      type: 'TASK',
      title: `Task Completed: ${t.title}`,
      time: t.updatedAt,
      icon: 'check-circle'
    });
  });

  return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};
