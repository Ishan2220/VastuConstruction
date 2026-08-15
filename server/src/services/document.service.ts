import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma, } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  type?: string;
  projectId?: string;
  clientId?: string;
  vendorId?: string;
  leadId?: string;
  search?: string;
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 20, type, projectId, clientId, vendorId, leadId, search } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.DocumentWhereInput = {
    ...(type && { type }),
    ...(projectId && { projectId }),
    ...(clientId && { clientId }),
    ...(vendorId && { vendorId }),
    ...(leadId && { leadId }),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  };

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new ApiError(404, 'Document not found');
  return doc;
};

export const create = async (data: Prisma.DocumentUncheckedCreateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...restData } = data;
  const doc = await prisma.document.create({
    data: { ...restData, uploadedById: userId },
  });
  eventBus.publishMutation('Document', 'CREATE', userId, doc.id, idempotencyKey || crypto.randomUUID(), doc, null);
  return doc;
};

export const update = async (id: string, data: Prisma.DocumentUpdateInput, userId: string, idempotencyKey?: string) => {
  const oldDoc = await getById(id);
  const doc = await prisma.document.update({
    where: { id },
    data,
  });
  eventBus.publishMutation('Document', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), doc, oldDoc);
  return doc;
};

export const remove = async (id: string, userId: string, idempotencyKey?: string) => {
  const oldDoc = await getById(id);
  
  // Check if ADMIN or uploader
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if ((user?.(role !== 'ADMIN' && role !== 'SUPER_ADMIN') && user?.role !== 'SUPER_ADMIN') && oldDoc.uploadedById !== userId) {
    throw new ApiError(403, 'Unauthorized to delete this document');
  }

  await prisma.document.delete({ where: { id } });

  if (oldDoc.fileUrl) {
    const file = await prisma.file.findFirst({
      where: { publicUrl: oldDoc.fileUrl, deletedAt: null }
    });
    if (file) {
      await prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: new Date(), status: 'DELETED' }
      });
    }
  }

  eventBus.publishMutation('Document', 'DELETE', userId, id, idempotencyKey || crypto.randomUUID(), null, oldDoc);
  return { success: true };
};
