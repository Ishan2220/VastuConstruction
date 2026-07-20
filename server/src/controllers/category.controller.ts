import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const prisma = new PrismaClient();

export const getCategoriesByType = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type as string;
  if (!type) {
    throw new ApiError(400, 'Category type is required');
  }

  const categories = await prisma.customCategory.findMany({
    where: { type },
    orderBy: { value: 'asc' },
  });

  res.status(200).json({
    success: true,
    data: categories.map(c => c.value),
  });
});

export const addCustomCategory = asyncHandler(async (req: Request, res: Response) => {
  const { type, value } = req.body;

  if (!type || !value) {
    throw new ApiError(400, 'type and value are required');
  }

  // Use upsert to gracefully handle duplicates
  const category = await prisma.customCategory.upsert({
    where: {
      type_value: {
        type,
        value,
      },
    },
    update: {},
    create: {
      type,
      value,
    },
  });

  res.status(201).json({
    success: true,
    data: category.value,
  });
});
