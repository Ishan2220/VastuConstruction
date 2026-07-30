import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as payrollService from '../services/payroll.service.js';
import { PayrollEngine } from '../services/payrollEngine.service.js';
import { prisma } from '../config/database.js';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await payrollService.getSettings();
  res.json(new ApiResponse(200, settings, 'Payroll settings fetched successfully'));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await payrollService.updateSettings(req.body, req.user!.userId);
  res.json(new ApiResponse(200, settings, 'Payroll settings updated successfully'));
});

export const listPayrolls = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, employeeId } = req.query;
  const where: any = {};
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (employeeId) where.employeeId = employeeId;

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      employee: {
        include: { user: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(new ApiResponse(200, payrolls, 'Payrolls fetched successfully'));
});

export const generatePayroll = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, year } = req.body;
  const payroll = await PayrollEngine.generateMonthlyPayroll(employeeId, Number(month), Number(year));
  res.json(new ApiResponse(200, payroll, 'Payroll generated successfully'));
});

export const approvePayroll = asyncHandler(async (req: Request, res: Response) => {
  const payroll = await PayrollEngine.approvePayroll(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, payroll, 'Payroll approved successfully'));
});

export const freezePayroll = asyncHandler(async (req: Request, res: Response) => {
  const payroll = await PayrollEngine.freezePayroll(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, payroll, 'Payroll frozen successfully'));
});

export const reopenPayroll = asyncHandler(async (req: Request, res: Response) => {
  const payroll = await PayrollEngine.reopenPayroll(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, payroll, 'Payroll reopened successfully'));
});

export const payPayroll = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, paymentMethod, reference } = req.body;
  const payroll = await PayrollEngine.payPayroll(req.params.id as string, accountId, paymentMethod, reference, req.user!.userId);
  res.json(new ApiResponse(200, payroll, 'Payroll paid and reconciled successfully'));
});

export const deletePayroll = asyncHandler(async (req: Request, res: Response) => {
  const result = await PayrollEngine.deletePayroll(req.params.id as string);
  res.json(new ApiResponse(200, result, 'Payroll deleted successfully'));
});

export const addAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const { type, amount, reason } = req.body;
  const adjustment = await PayrollEngine.addAdjustment(
    req.params.id as string, 
    type, 
    Number(amount), 
    reason, 
    req.user!.userId
  );
  res.json(new ApiResponse(200, adjustment, 'Adjustment added successfully'));
});

export const getDailyLogs = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, month, year } = req.query;
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  const logs = await prisma.dailyWorkLog.findMany({
    where: {
      employeeId: employeeId as string,
      date: { gte: startDate, lte: endDate }
    },
    orderBy: { date: 'asc' }
  });
  res.json(new ApiResponse(200, logs, 'Daily logs fetched successfully'));
});
