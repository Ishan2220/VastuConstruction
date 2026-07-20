import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as reportService from '../services/report.service.js';

export const getFinancialSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.getFinancialSummary(req.query as any);
  res.json(new ApiResponse(200, result, 'Financial summary fetched successfully'));
});

export const getProjectReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.getProjectReport();
  res.json(new ApiResponse(200, result, 'Project report fetched successfully'));
});
