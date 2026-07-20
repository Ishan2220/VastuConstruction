import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/database.js';
import type { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  role: Role;
  name: string;
  email: string;
}

export const authenticate = asyncHandler(async (req, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, name: true, email: true, isActive: true, deletedAt: true, tempAdminUntil: true, tempAdminPages: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new ApiError(401, 'User account is deactivated or not found');
    }

    req.user = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      tempAdminUntil: user.tempAdminUntil,
      tempAdminPages: user.tempAdminPages,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Invalid or expired access token');
  }
});
