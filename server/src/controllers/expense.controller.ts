import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { validateBackdating } from '../utils/dateValidation.js';
import * as expenseService from '../services/expense.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await expenseService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Expenses fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.getById(req.params.id as string);
  res.json(new ApiResponse(200, expense, 'Expense fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const paymentDate = req.body.paymentDate || new Date();
  validateBackdating(paymentDate, req.user!.role);
  
  const data = { ...req.body, paymentDate: new Date(paymentDate) };
  const expense = await expenseService.create(data, req.user!.userId);
  res.status(201).json(new ApiResponse(201, expense, 'Expense recorded successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await expenseService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Expense record deleted successfully'));
});
