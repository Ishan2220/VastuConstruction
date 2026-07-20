import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from './ApiError.js';
import { prisma } from '../config/database.js';

export const requireIdempotencyKey = async (req: Request, res: Response, next: NextFunction) => {
  // Only mutating requests need idempotency
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next();
  }

  // Skip idempotency for auth routes
  if (req.path.startsWith('/auth')) {
    return next();
  }

  let idempotencyKey = req.header('Idempotency-Key') || req.header('idempotency-key');

  if (!idempotencyKey) {
    idempotencyKey = crypto.randomUUID();
  }

  // Check if idempotency key already exists
  try {
    const existing = await prisma.eventIdempotency.findUnique({
      where: { idempotencyKey }
    });

    if (existing) {
      // Duplicate request!
      // For now, we return 200 OK with a generic message indicating it was already processed.
      return res.status(200).json({
        statusCode: 200,
        data: null,
        message: 'Request already processed (Idempotent)',
        success: true
      });
    }
  } catch (error) {
    return next(error);
  }

  // Inject into request body so controllers can pass it down to services
  req.body = req.body || {};
  req.body.idempotencyKey = idempotencyKey;
  
  next();
};
