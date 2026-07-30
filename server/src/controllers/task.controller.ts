import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as taskService from '../services/task.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await taskService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Tasks fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.getById(req.params.id as string);
  res.json(new ApiResponse(200, task, 'Task fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = {
    ...req.body,
    ...(req.body.dueDate && { dueDate: new Date(req.body.dueDate) }),
  };
  const task = await taskService.create(data, req.user!.userId);
  res.status(201).json(new ApiResponse(201, task, 'Task created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data: any = { ...req.body };
  if (req.body.dueDate !== undefined) {
    data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  }
  if (req.body.status) {
    data.completedAt = req.body.status === 'COMPLETED' ? new Date() : null;
  }
  
  const task = await taskService.update(req.params.id as string, data, req.user!.userId);
  res.json(new ApiResponse(200, task, 'Task updated successfully'));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const data = {
    status,
    completedAt: status === 'COMPLETED' ? new Date() : null,
  };
  const task = await taskService.update(req.params.id as string, data, req.user!.userId);
  res.json(new ApiResponse(200, task, 'Task status updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await taskService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Task deleted successfully'));
});
