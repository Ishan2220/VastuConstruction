import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as incomeService from '../services/income.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await incomeService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Incomes fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const income = await incomeService.getById(req.params.id as string);
  res.json(new ApiResponse(200, income, 'Income fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body, paymentDate: new Date(req.body.paymentDate || new Date()) };
  const income = await incomeService.create(data, req.user!.userId);
  res.status(201).json(new ApiResponse(201, income, 'Income recorded successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await incomeService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Income record deleted successfully'));
});
