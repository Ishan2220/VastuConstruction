import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { prisma } from '../config/database.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const entity = req.query.entity as string | undefined;
  const userId = req.query.userId as string | undefined;

  const where = {
    ...(entity && { entity }),
    ...(userId && { userId }),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json(new ApiResponse(200, { data, total, page, limit, totalPages: Math.ceil(total / limit) }, 'Audit logs fetched successfully'));
});
