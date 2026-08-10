import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as attendanceService from '../services/attendance.service.js';

export const getByDate = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  const type = req.query.type as 'EMPLOYEE' | 'LABOR';
  
  if (!date || !type) {
    res.status(400).json(new ApiResponse(400, null, 'Date and type are required'));
    return;
  }
  
  const result = await attendanceService.getAttendanceByDate(date, type);
  res.json(new ApiResponse(200, result, 'Attendance fetched successfully'));
});

export const upsertOne = asyncHandler(async (req: Request, res: Response) => {
  const { personId, personType, date, status, overtimeHours, absentReason } = req.body;
  
  if (!personId || !personType || !date || !status) {
    res.status(400).json(new ApiResponse(400, null, 'personId, personType, date, status are required'));
    return;
  }

  const result = await attendanceService.upsertAttendance(
    personId,
    personType,
    date,
    status,
    overtimeHours,
    absentReason,
    req.user!.userId
  );
  
  res.status(200).json(new ApiResponse(200, result, 'Attendance record updated successfully'));
});

export const bulkUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { date, personType, updates } = req.body;
  
  if (!date || !personType || !Array.isArray(updates)) {
    res.status(400).json(new ApiResponse(400, null, 'date, personType, and updates array are required'));
    return;
  }

  const count = await attendanceService.bulkMarkPresent(
    date,
    personType,
    updates,
    req.user!.userId
  );
  
  res.status(200).json(new ApiResponse(200, { count }, `Successfully marked attendance for ${count} people`));
});

export const calendarSummary = asyncHandler(async (req: Request, res: Response) => {
  const month = req.query.month as string;
  const type = req.query.type as 'EMPLOYEE' | 'LABOR';
  
  if (!month || !type) {
    res.status(400).json(new ApiResponse(400, null, 'month and type are required'));
    return;
  }

  const result = await attendanceService.calendarSummary(month, type);
  res.status(200).json(new ApiResponse(200, result, 'Calendar summary fetched successfully'));
});
