import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Role } from '@prisma/client';

export const listUsers = async () => {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createUser = async (data: any, adminId: string) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role as Role,
      isActive: data.isActive ?? true,
      forcePasswordChange: true,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  eventBus.emit('audit.log', {
    userId: adminId,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    details: { name: user.name, role: user.role, email: user.email },
  });

  return user;
};

export const updateUserEmail = async (userId: string, newEmail: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) throw new ApiError(404, 'User not found');

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    throw new ApiError(400, 'Email is already in use by another account');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
  });
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) throw new ApiError(404, 'User not found');

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

export const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) throw new ApiError(404, 'User not found');

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });
  
  // also delete their refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};
