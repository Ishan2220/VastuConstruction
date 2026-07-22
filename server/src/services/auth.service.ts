import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Role } from '@prisma/client';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
  idempotencyKey?: string;
}

interface TokenPayload {
  userId: string;
  role: Role;
  name: string;
  email: string;
}

const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
    }
  );
};

const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
    }
  );
};

const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1]);
  switch (match[2]) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

export const register = async (data: RegisterData, creatorId: string) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ApiError(409, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const { idempotencyKey, ...restData } = data;

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  eventBus.publishMutation('User', 'CREATE', creatorId, user.id, idempotencyKey || crypto.randomUUID(), user, null);

  return user;
};

export const login = async (
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      password: true,
      isActive: true,
      deletedAt: true,
      avatar: true,
      tempAdminUntil: true,
      tempAdminPages: true,
      forcePasswordChange: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact admin.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }


  const tokenPayload: TokenPayload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in DB
  const expiresAt = new Date(Date.now() + parseExpiry(env.REFRESH_TOKEN_EXPIRY));
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Record login history + update lastLoginAt
  await Promise.all([
    prisma.loginHistory.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress,
        userAgent,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token: string) => {
  if (!token) {
    throw new ApiError(401, 'Refresh token is required');
  }

  // Verify the refresh token exists in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true } } },
  });

  if (!storedToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({ where: { id: storedToken.id } });
    throw new ApiError(401, 'Refresh token has expired');
  }

  if (!storedToken.user.isActive || storedToken.user.deletedAt) {
    throw new ApiError(403, 'User account is deactivated');
  }

  // Verify JWT signature
  try {
    jwt.verify(token, env.REFRESH_TOKEN_SECRET);
  } catch {
    await prisma.refreshToken.deleteMany({ where: { id: storedToken.id } });
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Rotate: delete old, create new
  await prisma.refreshToken.deleteMany({ where: { id: storedToken.id } });


  const tokenPayload: TokenPayload = {
    userId: storedToken.user.id,
    role: storedToken.user.role,
    name: storedToken.user.name,
    email: storedToken.user.email,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  const expiresAt = new Date(Date.now() + parseExpiry(env.REFRESH_TOKEN_EXPIRY));
  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: storedToken.user.id,
      expiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async (
  token: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
) => {
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  await prisma.loginHistory.create({
    data: {
      userId,
      action: 'LOGOUT',
      ipAddress,
      userAgent,
    },
  });
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      tempAdminUntil: true,
      tempAdminPages: true,
      forcePasswordChange: true,
      employee: {
        select: {
          designation: true,
          department: true,
          joiningDate: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }


  return user;
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // For security, don't reveal if user exists
    return { success: true };
  }

  // Demo flow: generate temp password and update
  const tempPassword = crypto.randomBytes(4).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 12);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return { tempPassword };
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new ApiError(400, 'Invalid current password');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, forcePasswordChange: false },
  });

  eventBus.emit('auth.passwordChanged', { userId });
};

export const changeEmail = async (userId: string, newEmail: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');

  const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existingUser && existingUser.id !== userId) {
    throw new ApiError(400, 'Email is already in use by another account');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
  });

  eventBus.emit('auth.emailChanged', { userId, oldEmail: user.email, newEmail });
};
