import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as empService from '../services/employee.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const employees = await empService.list();
  res.json(new ApiResponse(200, employees, 'Employees fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const employee = await empService.getById(req.params.id as string);
  res.json(new ApiResponse(200, employee, 'Employee profile fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee = await empService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, employee, 'Employee added successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const employee = await empService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, employee, 'Employee profile updated successfully'));
});

export const grantTempAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { durationHours, pages, userId } = req.body;
  const result = await empService.grantTempAdmin(userId, Number(durationHours) || 0, pages || []);
  res.json(new ApiResponse(200, result, 'Temporary admin privileges updated successfully'));
});

export const requestLeave = asyncHandler(async (req: Request, res: Response) => {
  const leave = await empService.requestLeave(req.body);
  res.status(201).json(new ApiResponse(201, leave, 'Leave requested successfully'));
});

export const updateLeaveStatus = asyncHandler(async (req: Request, res: Response) => {
  const leave = await empService.updateLeaveStatus(req.params.id as string, req.body.status);
  res.json(new ApiResponse(200, leave, 'Leave status updated successfully'));
});

export const listDailyReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await empService.listDailyReports(req.query as any);
  res.json(new ApiResponse(200, reports, 'Daily reports fetched successfully'));
});

export const createDailyReport = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body, userId: req.user!.userId, date: new Date(req.body.date || new Date()) };
  const report = await empService.createDailyReport(data);
  res.status(201).json(new ApiResponse(201, report, 'Daily site report submitted successfully'));
});

export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const currentMonth = Number(month) || new Date().getMonth() + 1;
  const currentYear = Number(year) || new Date().getFullYear();
  
  const attendance = await empService.getAttendance(req.params.id as string, currentMonth, currentYear);
  res.json(new ApiResponse(200, attendance, 'Employee attendance fetched successfully'));
});
