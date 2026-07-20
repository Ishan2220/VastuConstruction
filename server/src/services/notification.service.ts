import { prisma } from '../config/database.js';
import type { NotificationType } from '@prisma/client';

export const listForUser = async (userId: string) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { data: notifications, unreadCount };
};

export const markAsRead = async (id: string, userId: string) => {
  return prisma.notification.update({
    where: { id, userId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const create = async (userId: string, type: NotificationType, title: string, message: string, linkUrl?: string) => {
  return prisma.notification.create({
    data: { userId, type, title, message, linkUrl },
  });
};
