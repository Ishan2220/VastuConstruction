import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getAdminDashboard();
  res.json(new ApiResponse(200, data, 'Dashboard data fetched'));
});

export const getKPIs = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getDashboardKPIs();
  res.json(data); // Must return exact shape without wrapper based on PDF
});

export const getEngineerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getEngineerDashboard(req.user!.userId);
  res.json(new ApiResponse(200, data, 'Engineer dashboard data fetched'));
});

export const getTodayActivities = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getTodayActivities();
  res.json(new ApiResponse(200, data, 'Today activities fetched'));
});
