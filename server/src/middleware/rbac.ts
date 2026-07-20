import type { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authorize = (...args: (Role | { page: string })[]) => {
  const allowedRoles = args.filter(a => typeof a === 'string') as Role[];
  const pageArg = args.find(a => typeof a === 'object' && 'page' in a) as { page: string } | undefined;

  return asyncHandler(async (req, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    let hasAccess = allowedRoles.includes(req.user.role);

    if (!hasAccess && pageArg && req.user.tempAdminUntil && req.user.tempAdminPages) {
      const isNotExpired = new Date(req.user.tempAdminUntil) > new Date();
      if (isNotExpired && req.user.tempAdminPages.includes(pageArg.page)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }

    next();
  });
};
