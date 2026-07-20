import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { cleanRelationId } from '../utils/normalizers.js';
import type { Prisma } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  city?: string;
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', city } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
  };

  const [rawData, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { projects: true } },
        createdBy: { select: { name: true } },
        invoices: { where: { status: { not: 'CANCELLED' } }, select: { totalAmount: true } },
        incomes: { select: { amount: true } }
      },
    }),
    prisma.client.count({ where }),
  ]);

  const data = rawData.map(client => {
    const totalBilled = client.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = client.incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const openingBal = Number(client.openingBalance || 0);
    const outstanding = openingBal + totalBilled - totalPaid;
    
    const { invoices, incomes, ...rest } = client;
    
    return {
      ...rest,
      totalBilled,
      totalPaid,
      outstanding
    };
  });

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, progress: true, contractValue: true },
      },
      incomes: {
        select: { id: true, amount: true, paymentDate: true, paymentMethod: true, type: true },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
      notes: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      lead: { select: { id: true, name: true, status: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!client) throw new ApiError(404, 'Client not found');
  return client;
};

export const create = async (payload: any, userId: string) => {
  const { gstin, id: _id, createdAt, updatedAt, deletedAt, _count, projects, incomes, notes, documents, lead, createdBy, createdById, idempotencyKey, ...rest } = payload;
  const data: Prisma.ClientUncheckedCreateInput = {
    ...rest,
    leadId: cleanRelationId(rest.leadId) || null,
    ...(gstin !== undefined && rest.gst === undefined ? { gst: gstin } : {}),
    createdById: userId,
  };
  const client = await prisma.client.create({
    data,
  });
  eventBus.publishMutation('Client', 'CREATE', userId, client.id, crypto.randomUUID() || crypto.randomUUID(), client, null);
  return client;
};

export const update = async (id: string, payload: any, userId: string) => {
  const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Client not found');

  const { gstin, id: _id, createdAt, updatedAt, deletedAt, _count, projects, incomes, notes, documents, lead, createdBy, createdById, idempotencyKey, ...rest } = payload;
  const data: Prisma.ClientUncheckedUpdateInput = {
    ...rest,
    ...(rest.leadId !== undefined && { leadId: cleanRelationId(rest.leadId) || null }),
    ...(gstin !== undefined && rest.gst === undefined ? { gst: gstin } : {}),
  };

  const client = await prisma.client.update({ where: { id }, data });
  eventBus.publishMutation('Client', 'UPDATE', userId, id, crypto.randomUUID() || crypto.randomUUID(), client, existing);
  return client;
};

export const remove = async (id: string, userId: string) => {
  const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Client not found');

  const client = await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  eventBus.publishMutation('Client', 'DELETE', userId, id, crypto.randomUUID() || crypto.randomUUID(), null, existing);
  return client;
};

export const addNote = async (clientId: string, userId: string, content: string) => {
  const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
  if (!client) throw new ApiError(404, 'Client not found');

  return prisma.clientNote.create({
    data: { clientId, userId, content },
    include: { user: { select: { name: true } } },
  });
};
