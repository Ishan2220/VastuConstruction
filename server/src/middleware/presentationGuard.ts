import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/database.js';
import { isMutationAllowedInPresentation } from './presentationPolicy.js';

export const presentationGuard = async (req: Request, res: Response, next: NextFunction) => {
  const isPresentationMode = (req as any).isPresentationMode;
  
  if (!isPresentationMode) {
    return next();
  }

  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.path;

  // Use the policy logic to determine if the mutation is allowed
  if (!isMutationAllowedInPresentation(method, path)) {
    // Log the blocked action
    const sessionId = (req as any).presentationSessionId;
    const userId = (req.user as any)?.userId;
    
    if (sessionId && userId) {
      // Async log, don't wait
      prisma.auditLog.create({
        data: {
          action: 'PRESENTATION_PROTECTED_OPERATION_BLOCKED',
          entity: 'System',
          entityId: sessionId,
          userId: userId,
          newData: { method, path, ip: req.ip, reason: `Blocked ${method} ${path} during presentation mode` }
        }
      }).catch(console.error);
    }
    
    return next(new ApiError(403, 'This operation is disabled during presentation mode.'));
  }

  next();
};
