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
    },
  });

  if (!project) throw new ApiError(404, 'Project not found');
  return project;
};

export const create = async (payload: any, userId: string) => {
  const { code, budget, id: _id, createdAt, updatedAt, client, engineer, createdBy, siteProgress, timeline, tasks, _count, idempotencyKey, ...validData } = payload;
  const data: Prisma.ProjectUncheckedCreateInput = {
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

export const update = async (id: string, payload: any, userId: string) => {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Project not found');

  const { code, budget, id: _id, createdAt, updatedAt, client, engineer, createdBy, siteProgress, timeline, tasks, _count, createdById, idempotencyKey, ...validData } = payload;
  const data: Prisma.ProjectUncheckedUpdateInput = {
    ...(validData.name && { name: validData.name }),
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
  };

  const project = await prisma.project.update({ where: { id }, data });

  // Add timeline for status changes
  if (data.status && data.status !== existing.status) {
    await prisma.projectTimeline.create({
      data: {
        projectId: id,
        action: `Status changed from ${existing.status} to ${data.status}`,
      },
    });
  }

  eventBus.publishMutation('Project', 'UPDATE', userId, id, idempotencyKey || randomUUID(), project, existing);
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

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Project not found');

  const project = await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  eventBus.publishMutation('Project', 'DELETE', userId, id, idempotencyKey || randomUUID(), null, existing);
  return project;
};

export const addProgress = addSiteProgress;
