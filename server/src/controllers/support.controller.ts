import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const superAdminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || user.role !== 'SUPER_ADMIN' || !user.isActive || user.deletedAt) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, name: user.name, email: user.email },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1d' } // Use standard short-lived token logic
  );

  res.json(
    new ApiResponse(200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
    }, 'Super Admin Login successful')
  );
});

export const startPresentationSession = asyncHandler(async (req: Request, res: Response) => {
  const { reason, durationMinutes } = req.body;
  const superAdminId = req.user!.userId;

  if (!reason) throw new ApiError(400, 'Reason is mandatory');
  
  const duration = Math.min(Math.max(Number(durationMinutes) || 30, 1), 60); // Max 60 mins

  // Generate secure exchange code
  const rawExchangeCode = crypto.randomBytes(32).toString('hex');
  const hashedExchangeCode = crypto.createHash('sha256').update(rawExchangeCode).digest('hex');

  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  const session = await prisma.supportSession.create({
    data: {
      superAdminId,
      reason,
      exchangeCode: hashedExchangeCode,
      expiresAt,
    }
  });

  // Log creation
  await prisma.auditLog.create({
    data: {
      userId: superAdminId,
      action: 'PRESENTATION_SESSION_STARTED',
      entity: 'SupportSession',
      entityId: session.id,
      newData: { reason, durationMinutes: duration }
    }
  }).catch(console.error);

  // Return raw code ONLY ONCE
  res.json(new ApiResponse(201, { exchangeCode: rawExchangeCode }, 'Presentation session started'));
});

export const exchangePresentationCode = asyncHandler(async (req: Request, res: Response) => {
  const { exchangeCode } = req.body;
  if (!exchangeCode) throw new ApiError(400, 'Exchange code is required');

  const hashedExchangeCode = crypto.createHash('sha256').update(exchangeCode).digest('hex');

  const session = await prisma.supportSession.findUnique({
    where: { exchangeCode: hashedExchangeCode }
  });

  if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired exchange code');
  }

  // Mark as used atomically
  const updatedCount = await prisma.supportSession.updateMany({
    where: { 
      id: session.id,
      exchangeCode: hashedExchangeCode, // ensure it hasn't changed
      status: 'ACTIVE' // ensure it hasn't been used
    },
    data: { 
      usedAt: new Date(),
      status: 'USED', // Mark as used
      exchangeCode: crypto.randomBytes(32).toString('hex') // Invalidates the old code
    }
  });

  if (updatedCount.count === 0) {
    throw new ApiError(401, 'Invalid or expired exchange code');
  }

  // Generate support JWT (Cookie)
  const supportToken = jwt.sign(
    { sessionId: session.id, role: 'SUPER_ADMIN' },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000) }
  );

  const isProd = env.NODE_ENV === 'production';
  res.cookie('support_session_token', supportToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    expires: session.expiresAt,
    path: '/',
  });

  await prisma.auditLog.create({
    data: {
      action: 'PRESENTATION_SESSION_EXCHANGED',
      entity: 'SupportSession',
      entityId: session.id,
      newData: { ip: req.ip }
    }
  }).catch(console.error);

  // Generate standard access token for the frontend to use
  const user = await prisma.user.findUnique({ where: { id: session.superAdminId } });
  if (!user) throw new ApiError(500, 'Super Admin not found');

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, name: user.name, email: user.email },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000) }
  );

  res.json(new ApiResponse(200, { 
    expiresAt: session.expiresAt, 
    reason: session.reason,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    accessToken
  }, 'Exchange successful'));
});

export const revokePresentationSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const superAdminId = req.user!.userId;

  const session = await prisma.supportSession.findFirst({
    where: { id: sessionId, superAdminId }
  });

  if (!session) throw new ApiError(404, 'Session not found');

  await prisma.supportSession.update({
    where: { id: session.id },
    data: { status: 'REVOKED', revokedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId: superAdminId,
      action: 'PRESENTATION_SESSION_ENDED',
      entity: 'SupportSession',
      entityId: session.id,
    }
  }).catch(console.error);

  // Clear cookie from the admin's browser (though the actual token revoker is the admin)
  // Wait, if the user calling this is the super admin, clearing the cookie in THIS response 
  // doesn't clear the cookie in the presentation browser unless they are the same browser. 
  // But updating the DB effectively invalidates the presentation session immediately.
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('support_session_token', {
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  res.json(new ApiResponse(200, null, 'Presentation session revoked'));
});
