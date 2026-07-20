import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as materialService from '../services/material.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await materialService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Materials fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const material = await materialService.getById(req.params.id as string);
  res.json(new ApiResponse(200, material, 'Material fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const material = await materialService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, material, 'Material created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const material = await materialService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, material, 'Material updated successfully'));
});

export const getStock = asyncHandler(async (req: Request, res: Response) => {
  const stock = await materialService.getStock(req.query.projectId as string | undefined);
  res.json(new ApiResponse(200, stock, 'Stock fetched successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await materialService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, result, 'Material deleted successfully'));
});

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await materialService.updateStock(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, result, 'Stock updated successfully'));
});

export const removeStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await materialService.removeStock(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, result, 'Stock record deleted successfully'));
});
