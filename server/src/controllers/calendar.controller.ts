import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as calendarService from '../services/calendar.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const events = await calendarService.list(
    req.user!.userId,
    req.query.startDate as string | undefined,
    req.query.endDate as string | undefined
  );
  res.json(new ApiResponse(200, events, 'Calendar events fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = {
    ...req.body,
    userId: req.user!.userId,
    startTime: new Date(req.body.startTime),
    ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
  };
  const event = await calendarService.create(data);
  res.status(201).json(new ApiResponse(201, event, 'Calendar event created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const event = await calendarService.update(req.params.id as string, req.body);
  res.json(new ApiResponse(200, event, 'Calendar event updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await calendarService.remove(req.params.id as string);
  res.json(new ApiResponse(200, null, 'Calendar event deleted successfully'));
});
