import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getAdminDashboard();
  res.json(new ApiResponse(200, data, 'Dashboard data fetched'));
});

export const getEngineerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getEngineerDashboard(req.user!.userId);
  res.json(new ApiResponse(200, data, 'Engineer dashboard data fetched'));
});
