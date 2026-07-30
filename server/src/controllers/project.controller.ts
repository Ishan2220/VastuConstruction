import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as projectService from '../services/project.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const isEngineer = req.user!.role === 'ENGINEER';
  const query = { ...req.query, ...(isEngineer && { engineerId: req.user!.userId }) };
  const result = await projectService.list(query as any);
  res.json(new ApiResponse(200, result, 'Projects fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getById(req.params.id as string);
  res.json(new ApiResponse(200, project, 'Project fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, project, 'Project created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, project, 'Project updated successfully'));
});

export const addProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await projectService.addProgress(req.params.id as string, req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, progress, 'Site progress added successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await projectService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Project deleted successfully'));
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await projectService.getSiteDashboard(req.params.id as string, req.user!.userId, req.user!.role);
  res.json(new ApiResponse(200, dashboard, 'Project dashboard fetched successfully'));
});
