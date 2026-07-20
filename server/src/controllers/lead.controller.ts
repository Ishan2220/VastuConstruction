import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as leadService from '../services/lead.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await leadService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Leads fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.getById(req.params.id as string);
  res.json(new ApiResponse(200, lead, 'Lead fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, lead, 'Lead created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, lead, 'Lead updated successfully'));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.updateStatus(req.params.id as string, req.body.status, req.user!.userId, req.body.notes);
  res.json(new ApiResponse(200, lead, 'Lead status updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await leadService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Lead deleted successfully'));
});
