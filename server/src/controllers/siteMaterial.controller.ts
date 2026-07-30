import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as siteMaterialService from '../services/siteMaterial.service.js';

export const getSiteMaterialsSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await siteMaterialService.getSiteMaterialsSummary(req.params.projectId as string);
  res.json(new ApiResponse(200, result, 'Site materials summary fetched successfully'));
});

export const receiveMaterial = asyncHandler(async (req: Request, res: Response) => {
  const result = await siteMaterialService.receiveMaterial(req.params.projectId as string, req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, result, 'Material received successfully'));
});

export const consumeMaterial = asyncHandler(async (req: Request, res: Response) => {
  const result = await siteMaterialService.consumeMaterial(req.params.projectId as string, req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, result, 'Material consumed successfully'));
});

export const getMaterialHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await siteMaterialService.getMaterialHistory(req.params.projectId as string, req.params.materialId as string);
  res.json(new ApiResponse(200, history, 'Material history fetched successfully'));
});
