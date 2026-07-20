import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const getMilestones = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  const whereClause = projectId ? { projectId: projectId as string } : {};

  const milestones = await prisma.projectMilestone.findMany({
    where: whereClause,
    orderBy: { targetDate: 'asc' },
    include: {
      engineer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectCode: true } }
    }
  });

  res.json(new ApiResponse(200, milestones, 'Milestones retrieved successfully'));
};

export const createMilestone = async (req: Request, res: Response) => {
  const { projectId, title, description, targetDate, engineerId, budgetAllocated } = req.body;

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      title,
      description,
      targetDate: new Date(targetDate),
      engineerId,
      budgetAllocated,
      status: 'PENDING'
    }
  });

  res.status(201).json(new ApiResponse(201, milestone, 'Milestone created successfully'));
};

export const updateMilestone = async (req: Request, res: Response) => {
  const { title, description, targetDate, engineerId, budgetAllocated, completionPct, status, delayDays, remarks } = req.body;

  const milestone = await prisma.projectMilestone.update({
    where: { id: req.params.id as string },
    data: {
      title,
      description,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      engineerId,
      budgetAllocated,
      completionPct,
      status,
      delayDays,
      remarks
    }
  });

  res.json(new ApiResponse(200, milestone, 'Milestone updated successfully'));
};

export const deleteMilestone = async (req: Request, res: Response) => {
  await prisma.projectMilestone.delete({
    where: { id: req.params.id as string }
  });

  res.json(new ApiResponse(200, null, 'Milestone deleted successfully'));
};
