import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, vendorId, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.MaterialWhereInput = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(vendorId && { vendorId }),
  };

  const [data, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { orderItems: true, stock: true } },
      },
    }),
    prisma.material.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, phone: true } },
      stock: {
        include: { project: { select: { id: true, name: true } } },
      },
      orderItems: {
        take: 10,
        orderBy: { order: { orderDate: 'desc' } },
        include: {
          order: { select: { id: true, orderNumber: true, orderDate: true, status: true } },
        },
      },
    },
  });

  if (!material) throw new ApiError(404, 'Material not found');
  return material;
};

export const create = async (data: Prisma.MaterialUncheckedCreateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...rest } = data;
  const material = await prisma.material.create({
    data: rest,
    include: { vendor: { select: { name: true } } },
  });
  eventBus.publishMutation('Material', 'CREATE', userId, material.id, idempotencyKey || crypto.randomUUID(), material, null);
  return material;
};

export const update = async (id: string, data: Prisma.MaterialUncheckedUpdateInput & { idempotencyKey?: string }, userId: string) => {
  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Material not found');

  const { idempotencyKey, ...rest } = data;
  const material = await prisma.material.update({ where: { id }, data: rest });
  eventBus.publishMutation('Material', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), material, existing);
  return material;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Material not found');

  await prisma.stock.deleteMany({ where: { materialId: id } });
  try {
    const material = await prisma.material.delete({ where: { id } });
    eventBus.publishMutation('Material', 'DELETE', userId, id, idempotencyKey || crypto.randomUUID(), null, existing);
    return material;
  } catch (_e) {
    const material = await prisma.material.update({
      where: { id },
      data: { isActive: false },
    });
    eventBus.publishMutation('Material', 'DELETE', userId, id, idempotencyKey || crypto.randomUUID(), null, existing);
    return material;
  }
};

export const getStock = async (projectId?: string) => {
  const where = projectId ? { projectId } : {};
  const stocks = await prisma.stock.findMany({
    where,
    include: {
      material: true,
      project: { select: { id: true, name: true } },
    },
  });
  return { data: stocks };
};

export const updateStock = async (id: string, data: { quantity?: number, idempotencyKey?: string }, userId: string) => {
  const existing = await prisma.stock.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Stock item not found');
  const updated = await prisma.stock.update({
    where: { id },
    data: { quantity: data.quantity !== undefined ? Number(data.quantity) : existing.quantity },
  });
  eventBus.publishMutation('Stock', 'UPDATE', userId, id, data.idempotencyKey || crypto.randomUUID(), updated, existing);
  return updated;
};

export const removeStock = async (id: string, userId: string, idempotencyKey?: string) => {
  const existing = await prisma.stock.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Stock item not found');
  const removed = await prisma.stock.delete({ where: { id } });
  eventBus.publishMutation('Stock', 'DELETE', userId, id, idempotencyKey || crypto.randomUUID(), null, existing);
  return removed;
};
