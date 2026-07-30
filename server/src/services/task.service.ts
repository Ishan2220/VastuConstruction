import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma, TaskStatus, TaskPriority } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  assigneeId?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 20, assigneeId, projectId, status, priority, search } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.TaskWhereInput = {
    ...(assigneeId && { assigneeId }),
    ...(projectId && { projectId }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
};

export const create = async (payload: Prisma.TaskUncheckedCreateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...data } = payload;
  const task = await prisma.task.create({ data });
  eventBus.publishMutation('Task', 'CREATE', userId, task.id, idempotencyKey || crypto.randomUUID(), task, null);
  return task;
};

export const update = async (id: string, payload: Prisma.TaskUpdateInput & { idempotencyKey?: string }, userId: string) => {
  const { idempotencyKey, ...data } = payload;
  const oldTask = await getById(id);
  const task = await prisma.task.update({ where: { id }, data });
  eventBus.publishMutation('Task', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), task, oldTask);
  return task;
};

export const remove = async (id: string, userId: string) => {
  const oldTask = await getById(id);
  await prisma.task.delete({ where: { id } });
  eventBus.publishMutation('Task', 'DELETE', userId, id, crypto.randomUUID(), null, oldTask);
  return { success: true };
};
