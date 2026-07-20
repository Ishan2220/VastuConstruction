import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as notifService from '../services/notification.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await notifService.listForUser(req.user!.userId);
  res.json(new ApiResponse(200, result, 'Notifications fetched successfully'));
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notif = await notifService.markAsRead(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, notif, 'Notification marked as read'));
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notifService.markAllAsRead(req.user!.userId);
  res.json(new ApiResponse(200, null, 'All notifications marked as read'));
});
