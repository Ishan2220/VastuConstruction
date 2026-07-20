import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as clientService from '../services/client.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await clientService.list(req.query);
  res.json(new ApiResponse(200, result, 'Clients fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getById(req.params.id as string);
  res.json(new ApiResponse(200, client, 'Client fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, client, 'Client created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, client, 'Client updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await clientService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Client deleted successfully'));
});
