import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma, LeadStatus } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus;
  source?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, status, source, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
    ...(source && { source }),
  };

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { timeline: true, documents: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { name: true } },
      timeline: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!lead) throw new ApiError(404, 'Lead not found');
  return lead;
};

export const create = async (data: Prisma.LeadUncheckedCreateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...restData } = data;
  const lead = await prisma.lead.create({
    data: { ...restData, createdById: userId },
    include: { assignee: { select: { name: true } } },
  });

  // Add timeline entry
  await prisma.leadTimeline.create({
    data: { leadId: lead.id, action: 'Lead created', notes: `Lead "${lead.name}" was created` },
  });

  eventBus.publishMutation('Lead', 'CREATE', userId, lead.id, idempotencyKey || crypto.randomUUID(), lead, null);
  return lead;
};

export const update = async (id: string, data: Prisma.LeadUncheckedUpdateInput & { idempotencyKey?: string }, userId: string) => {
  const existing = await getById(id);
  const { idempotencyKey, ...restData } = data;
  const lead = await prisma.lead.update({
    where: { id },
    data: restData,
    include: { assignee: { select: { name: true } } },
  });

  eventBus.publishMutation('Lead', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), lead, existing);
  return lead;
};

export const updateStatus = async (id: string, status: LeadStatus, userId: string, notes?: string) => {
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Lead not found');

  const lead = await prisma.lead.update({
    where: { id },
    data: { status },
  });

  // Add timeline entry
  await prisma.leadTimeline.create({
    data: {
      leadId: id,
      action: `Status changed from ${existing.status} to ${status}`,
      notes,
    },
  });

  eventBus.publishMutation('Lead', 'UPDATE', userId, id, crypto.randomUUID(), { status }, { status: existing.status });
  return lead;
};

export const getTimeline = async (id: string) => {
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!lead) throw new ApiError(404, 'Lead not found');

  return prisma.leadTimeline.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' },
  });
};

export const remove = async (id: string, userId: string) => {
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Lead not found');

  const lead = await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  eventBus.publishMutation('Lead', 'DELETE', userId, id, crypto.randomUUID(), null, existing);
  return lead;
};
