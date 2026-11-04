import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma, ProjectStatus, Role } from '@prisma/client';
import { cleanRelationId } from '../utils/normalizers.js';
import { eventBus } from '../events/EventBus.js';
import { randomUUID } from 'crypto';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  userRole?: Role;
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, status, clientId, sortBy = 'createdAt', sortOrder = 'desc', userId, userRole } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
    ...(clientId && { clientId }),
    // Engineers can only see their assigned projects
    ...(userRole === 'ENGINEER' && userId && { engineerId: userId }),
  };

  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        engineer: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { expenses: true, incomes: true, tasks: true, siteProgress: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string, userId?: string, userRole?: Role) => {
  const where: Prisma.ProjectWhereInput = { id, deletedAt: null };
  if (userRole === 'ENGINEER' && userId) {
    where.engineerId = userId;
  }

  const project = await prisma.project.findFirst({
    where,
    include: {
      client: { select: { id: true, name: true, phone: true, email: true } },
      engineer: { select: { id: true, name: true, email: true } },
      createdBy: { select: { name: true } },
      siteProgress: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { createdBy: { select: { name: true } } },
      },
      timeline: { orderBy: { createdAt: 'desc' }, take: 20 },
      tasks: {
        where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: { assignee: { select: { name: true } } },
      },
      _count: {
        select: { expenses: true, incomes: true, documents: true, materialOrders: true, labourAssignments: true },
      },
      milestones: { orderBy: { targetDate: 'asc' } },
    },
  });

  if (!project) throw new ApiError(404, 'Project not found');

  // Compute Site Financials, Payments, and Materials breakdown
  const [incomes, expenses, materialOrders, stocks, consumptions] = await Promise.all([
    prisma.income.findMany({
      where: { projectId: id, deletedAt: null },
      orderBy: { paymentDate: 'desc' },
      take: 20,
    }),
    prisma.expense.findMany({
      where: { projectId: id, deletedAt: null },
      include: { vendor: { select: { id: true, name: true } }, account: { select: { bankName: true, accountNo: true } } },
      orderBy: { paymentDate: 'desc' },
      take: 30,
    }),
    prisma.materialOrder.findMany({
      where: { projectId: id },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { material: { select: { id: true, name: true, unit: true, rate: true } } } },
      },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.stock.findMany({
      where: { projectId: id },
      include: { material: { select: { id: true, name: true, unit: true, rate: true } } },
    }),
    prisma.materialConsumption.findMany({
      where: { projectId: id },
    }),
  ]);

  const contractValue = Number(project.contractValue || 0);
  const clientDone = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const clientPending = Math.max(0, contractValue - clientDone);

  // Vendor payments
  const nonAccruedExpenses = expenses.filter(e => e.paymentMethod !== 'ACCRUED');
  const vendorExpenses = nonAccruedExpenses.filter(e => e.type === 'VENDOR' || e.type === 'MATERIAL');
  const vendorDone = vendorExpenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount), 0);

  const totalMaterialOrdersVal = materialOrders.reduce((sum, mo) => sum + Number(mo.totalAmount), 0);
  const vendorPending = Math.max(0, totalMaterialOrdersVal - vendorDone);

  // Labour payments
  const labourExpenses = nonAccruedExpenses.filter(e => e.type === 'LABOUR');
  const labourDone = labourExpenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount), 0);

  // Total spent across all actual site expenses
  const totalSpent = nonAccruedExpenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount), 0);

  // Material supplied breakdown
  const materialMap = new Map<string, {
    materialId: string;
    name: string;
    unit: string;
    quantitySupplied: number;
    currentStock: number;
    consumed: number;
    rate: number;
    totalCost: number;
  }>();

  // 1. From Material Orders
  for (const mo of materialOrders) {
    for (const item of mo.items) {
      const mat = item.material;
      if (!mat) continue;
      const existing = materialMap.get(mat.id) || {
        materialId: mat.id,
        name: mat.name,
        unit: mat.unit,
        quantitySupplied: 0,
        currentStock: 0,
        consumed: 0,
        rate: Number(item.rate || mat.rate || 0),
        totalCost: 0,
      };
      existing.quantitySupplied += Number(item.quantityOrdered);
      existing.totalCost += Number(item.amount || (Number(item.quantityOrdered) * Number(item.rate)));
      materialMap.set(mat.id, existing);
    }
  }

  // 2. From Stock & Consumptions
  for (const st of stocks as any[]) {
    const mat = st.material;
    if (!mat) continue;
    const existing = materialMap.get(mat.id) || {
      materialId: mat.id,
      name: mat.name,
      unit: mat.unit,
      quantitySupplied: Number(st.quantity),
      currentStock: Number(st.quantity),
      consumed: 0,
      rate: Number(mat.rate || 0),
      totalCost: Number(st.quantity) * Number(mat.rate || 0),
    };
    existing.currentStock = Number(st.quantity);
    if (!materialMap.has(mat.id)) {
      materialMap.set(mat.id, existing);
    }
  }

  for (const cs of consumptions) {
    if (cs.action === 'CONSUMED' && materialMap.has(cs.materialId)) {
      const m = materialMap.get(cs.materialId)!;
      m.consumed += Number(cs.quantity);
    }
  }

  const materialsSupplied = Array.from(materialMap.values());
  const totalMaterialSuppliedCost = materialsSupplied.reduce((sum, m) => sum + m.totalCost, 0) || totalMaterialOrdersVal;

  const siteFinancials = {
    clientPayments: {
      contractValue,
      done: clientDone,
      pending: clientPending,
      recent: incomes,
    },
    vendorPayments: {
      totalObligation: totalMaterialOrdersVal,
      done: vendorDone,
      pending: vendorPending,
      recent: vendorExpenses,
    },
    labourPayments: {
      done: labourDone,
      recent: labourExpenses,
    },
    materialSupplied: {
      totalCost: totalMaterialSuppliedCost,
      totalCount: materialsSupplied.length,
      materials: materialsSupplied,
      orders: materialOrders.map(mo => {
        const orderPayments = vendorExpenses.filter(e => 
          (e.description && e.description.toUpperCase().includes(mo.orderNumber.toUpperCase())) ||
          (e.remarks && e.remarks.toUpperCase().includes(mo.orderNumber.toUpperCase()))
        );
        const paid = orderPayments.reduce((s, e) => s + Number(e.totalAmount || e.amount), 0);
        return {
          id: mo.id,
          orderNumber: mo.orderNumber,
          vendorName: mo.vendor?.name || 'Authorized Distributor',
          orderDate: mo.orderDate,
          totalAmount: Number(mo.totalAmount),
          paidAmount: paid,
          pendingAmount: Math.max(0, Number(mo.totalAmount) - paid),
          status: mo.status,
        };
      }),
    },
    summary: {
      totalReceived: clientDone,
      totalSpent,
      netMargin: clientDone - totalSpent,
    }
  };

  return {
    ...project,
    siteFinancials,
  };
};

const generateProjectCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `VC-${year}-`;
  const lastProject = await prisma.project.findFirst({
    where: { projectCode: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
  });
  let sequence = 1;
  if (lastProject && lastProject.projectCode) {
    const match = lastProject.projectCode.match(/-(\d+)$/);
    if (match) sequence = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${sequence.toString().padStart(3, '0')}`;
};

export const create = async (payload: any, userId: string) => {
  const { code, projectCode, budget, id: _id, createdAt, updatedAt, client, engineer, createdBy, siteProgress, timeline, tasks, _count, idempotencyKey, ...validData } = payload;
  
  const generatedCode = projectCode || code || await generateProjectCode();
  
  const data: Prisma.ProjectUncheckedCreateInput = {
    projectCode: generatedCode,
    name: validData.name || 'Unnamed Project',
    description: validData.description || null,
    clientId: cleanRelationId(validData.clientId) || '',
    engineerId: cleanRelationId(validData.engineerId) || null,
    startDate: validData.startDate ? new Date(validData.startDate) : new Date(),
    expectedCompletion: validData.expectedCompletion ? new Date(validData.expectedCompletion) : null,
    actualCompletion: validData.actualCompletion ? new Date(validData.actualCompletion) : null,
    status: validData.status || 'IN_PROGRESS',
    progress: Number(validData.progress) || 0,
    contractValue: validData.contractValue !== undefined && validData.contractValue !== '' ? Number(validData.contractValue) : (budget ? Number(budget) : 0),
    address: validData.address || null,
    city: validData.city || 'Mumbai',
    state: validData.state || 'Maharashtra',
    areaAddress: validData.areaAddress || null,
    primaryNumber: validData.primaryNumber || null,
    secondaryNumber: validData.secondaryNumber || null,
    siteEngineerName: validData.siteEngineerName || null,
    createdById: userId,
  };

  const project = await prisma.project.create({
    data,
    include: {
      client: { select: { name: true } },
      engineer: { select: { name: true } },
    },
  });

  await prisma.projectTimeline.create({
    data: { projectId: project.id, action: 'Project created', notes: `Project "${project.name}" was created` },
  });

  eventBus.publishMutation('Project', 'CREATE', userId, project.id, idempotencyKey || randomUUID(), project, null);
  return project;
};

export const update = async (id: string, payload: any, userId: string, userRole?: Role) => {
  const oldProject = await getById(id, userId, userRole);
  const { code, projectCode, budget, id: _id, createdAt, updatedAt, client, engineer, createdBy, siteProgress, timeline, tasks, _count, createdById, idempotencyKey, ...validData } = payload;
  const data: Prisma.ProjectUncheckedUpdateInput = {
    ...(validData.name && { name: validData.name }),
    ...(projectCode || code ? { projectCode: projectCode || code } : {}),
    ...(validData.description !== undefined && { description: validData.description || null }),
    ...(validData.clientId && { clientId: cleanRelationId(validData.clientId)! }),
    ...(validData.engineerId !== undefined && { engineerId: cleanRelationId(validData.engineerId) || null }),
    ...(validData.startDate && { startDate: new Date(validData.startDate) }),
    ...(validData.expectedCompletion !== undefined && { expectedCompletion: validData.expectedCompletion ? new Date(validData.expectedCompletion) : null }),
    ...(validData.actualCompletion !== undefined && { actualCompletion: validData.actualCompletion ? new Date(validData.actualCompletion) : null }),
    ...(validData.status && { status: validData.status }),
    ...(validData.progress !== undefined && { progress: Number(validData.progress) }),
    ...(validData.contractValue !== undefined && { contractValue: validData.contractValue !== '' ? Number(validData.contractValue) : (budget ? Number(budget) : null) }),
    ...(validData.address !== undefined && { address: validData.address || null }),
    ...(validData.city !== undefined && { city: validData.city || null }),
    ...(validData.state !== undefined && { state: validData.state || null }),
    ...(validData.areaAddress !== undefined && { areaAddress: validData.areaAddress || null }),
    ...(validData.primaryNumber !== undefined && { primaryNumber: validData.primaryNumber || null }),
    ...(validData.secondaryNumber !== undefined && { secondaryNumber: validData.secondaryNumber || null }),
    ...(validData.siteEngineerName !== undefined && { siteEngineerName: validData.siteEngineerName || null }),
  };

  const project = await prisma.project.update({ where: { id }, data });

  // Add timeline for status changes
  if (data.status && oldProject.status !== data.status) {
    await prisma.projectTimeline.create({
      data: {
        projectId: id,
        action: `Status changed from ${oldProject.status} to ${data.status}`,
      },
    });
  }

  eventBus.publishMutation('Project', 'UPDATE', userId, id, idempotencyKey || randomUUID(), project, oldProject);
  return project;
};

export const addSiteProgress = async (
  projectId: string,
  data: { title: string; description?: string; progress: number; photos?: string[] },
  userId: string
) => {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new ApiError(404, 'Project not found');

  const [progress] = await Promise.all([
    prisma.siteProgress.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        progress: data.progress,
        photos: data.photos || [],
        createdById: userId,
      },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { progress: data.progress },
    }),
    prisma.projectTimeline.create({
      data: {
        projectId,
        action: `Site progress updated to ${data.progress}%`,
        notes: data.title,
      },
    }),
  ]);

  eventBus.publishMutation('SiteProgress', 'CREATE', userId, progress.id, randomUUID(), progress, null);
  return progress;
};

export const remove = async (id: string, userId: string, userRole?: Role) => {
  const existing = await getById(id, userId, userRole);

  const project = await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  eventBus.publishMutation('Project', 'DELETE', userId, id, randomUUID(), null, existing);
  return project;
};

export const getSiteDashboard = async (id: string, userId?: string, userRole?: Role) => {
  const project = await getById(id, userId, userRole);
  
  const [incomes, expenses, allTasks] = await Promise.all([
    prisma.income.aggregate({
      where: { projectId: id, deletedAt: null },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { projectId: id, deletedAt: null },
      _sum: { amount: true }
    }),
    prisma.task.findMany({
      where: { projectId: id }
    })
  ]);

  const totalReceived = incomes._sum.amount ? Number(incomes._sum.amount) : 0;
  const totalSpent = expenses._sum.amount ? Number(expenses._sum.amount) : 0;
  const contractValue = Number(project.contractValue || 0);
  
  const financialProgress = contractValue > 0 ? (totalReceived / contractValue) * 100 : 0;
  
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    ...project,
    dashboardStats: {
      totalReceived: project.siteFinancials?.clientPayments?.done ?? totalReceived,
      totalSpent: project.siteFinancials?.summary?.totalSpent ?? totalSpent,
      contractValue,
      clientPayments: project.siteFinancials?.clientPayments,
      vendorPayments: project.siteFinancials?.vendorPayments,
      labourPayments: project.siteFinancials?.labourPayments,
      materialSupplied: project.siteFinancials?.materialSupplied,
      financialProgress: Math.min(Math.round(financialProgress), 100),
      totalTasks,
      completedTasks,
      taskProgress: Math.min(Math.round(taskProgress), 100),
      manualProgress: project.progress
    }
  };
};

export const addProgress = addSiteProgress;
