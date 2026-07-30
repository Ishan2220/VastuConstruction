import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as settingsService from '../services/settings.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.getSettings();
  res.json(new ApiResponse(200, settings, 'Settings retrieved successfully'));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.body);
  res.json(new ApiResponse(200, settings, 'Settings updated successfully'));
});
