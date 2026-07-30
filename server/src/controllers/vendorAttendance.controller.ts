import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { submitHeadcount, getHeadcountsByDate } from '../services/vendorAttendance.service.js';
import { ApiError } from '../utils/ApiError.js';

export const submitVendorAttendance = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.userId || req.user?.id || 'system';
  const result = await submitHeadcount(req.body, userId);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getVendorAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date) {
    throw new ApiError(400, 'Date is required');
  }
  
  const results = await getHeadcountsByDate(date as string);
  res.status(200).json({
    success: true,
    data: results,
  });
});
