import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma } from '@prisma/client';

export const list = async (userId: string, startDate?: string, endDate?: string) => {
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      ...(startDate && endDate && {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    },
    orderBy: { startTime: 'asc' },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });
  return { data: events };
};

export const create = async (data: Prisma.CalendarEventUncheckedCreateInput) => {
  return prisma.calendarEvent.create({ data });
};

export const update = async (id: string, data: Prisma.CalendarEventUpdateInput) => {
  return prisma.calendarEvent.update({ where: { id }, data });
};

export const remove = async (id: string) => {
  await prisma.calendarEvent.delete({ where: { id } });
  return { success: true };
};
