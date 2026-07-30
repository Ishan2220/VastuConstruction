import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as bankService from '../services/bankAccount.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await bankService.list();
  res.json(new ApiResponse(200, accounts, 'Bank accounts fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const account = await bankService.getById(req.params.id as string);
  res.json(new ApiResponse(200, account, 'Bank account fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const account = await bankService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, account, 'Bank account created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const account = await bankService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, account, 'Bank account updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await bankService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Bank account deleted successfully'));
});

export const reconcile = asyncHandler(async (req: Request, res: Response) => {
  const { balance } = req.body;
  const account = await bankService.reconcile(req.params.id as string, Number(balance), req.user!.userId);
  res.json(new ApiResponse(200, account, 'Bank account reconciled successfully'));
});
