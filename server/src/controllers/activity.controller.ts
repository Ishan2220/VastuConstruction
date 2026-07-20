import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const getActivities = async (req: Request, res: Response) => {
  const { 
    page = 1, 
    limit = 20, 
    module,
    projectId,
    clientId,
    vendorId,
    employeeId,
    startDate,
    endDate,
    search
  } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const whereClause: any = {};

  if (module) whereClause.module = module;
  if (projectId) whereClause.projectId = projectId;
  if (clientId) whereClause.clientId = clientId;
  if (vendorId) whereClause.vendorId = vendorId;
  if (employeeId) whereClause.employeeId = employeeId;
  
  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate as string);
    if (endDate) whereClause.date.lte = new Date(endDate as string);
  }

  if (search) {
    whereClause.OR = [
      { description: { contains: search as string, mode: 'insensitive' } },
      { referenceNo: { contains: search as string, mode: 'insensitive' } },
      { action: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.businessActivity.findMany({
      where: whereClause,
      skip,
      take: limitNumber,
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        employee: { select: { id: true, user: { select: { name: true } } } }
      }
    }),
    prisma.businessActivity.count({ where: whereClause })
  ]);

  res.json(new ApiResponse(200, {
    activities,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber)
    }
  }, 'Activities retrieved successfully'));
};
