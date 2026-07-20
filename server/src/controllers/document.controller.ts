import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as docService from '../services/document.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await docService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Documents fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const doc = await docService.getById(req.params.id as string);
  res.json(new ApiResponse(200, doc, 'Document fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const doc = await docService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, doc, 'Document uploaded successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await docService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Document deleted successfully'));
});
