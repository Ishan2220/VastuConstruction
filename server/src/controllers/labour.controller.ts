import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as labourService from '../services/labour.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await labourService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Labours fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const labour = await labourService.getById(req.params.id as string);
  res.json(new ApiResponse(200, labour, 'Labour fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const labour = await labourService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, labour, 'Labour created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const labour = await labourService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, labour, 'Labour updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await labourService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Labour deleted successfully'));
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { labourId, amount, paymentDate, paymentMethod, isAdvance, notes, accountId } = req.body;
  const payment = await labourService.recordPayment(labourId, amount, new Date(paymentDate), paymentMethod, isAdvance, notes, accountId, req.user!.userId);
  res.status(201).json(new ApiResponse(201, payment, 'Labour payment recorded successfully'));
});
