import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isLocalOrDev = (req: any) => {
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') return true;
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
};

export const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000,
  skip: isLocalOrDev,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  skip: isLocalOrDev,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
