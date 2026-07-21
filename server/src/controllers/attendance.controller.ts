import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { prisma } from '../config/database.js';

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  
  // Get all employees and their attendance for the day
  const employees = await prisma.employee.findMany({
    where: { isArchived: false },
    include: {
      user: { select: { name: true, role: true } },
      attendance: {
        where: { date: targetDate }
      }
    }
  });

  const result = employees.map(emp => ({
    employeeId: emp.id,
    name: emp.user?.name || 'Unknown',
    role: emp.user?.role || 'EMPLOYEE',
    attendanceId: emp.attendance[0]?.id || null,
    status: emp.attendance[0]?.status || 'NOT_MARKED',
    checkIn: emp.attendance[0]?.checkIn || null,
    checkOut: emp.attendance[0]?.checkOut || null,
  }));

  res.json(new ApiResponse(200, result, 'Attendance fetched successfully'));
});

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, date, status } = req.body;
  const targetDate = new Date(date);

  const existing = await prisma.employeeAttendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: targetDate
      }
    }
  });

  let record;
  if (existing) {
    record = await prisma.employeeAttendance.update({
      where: { id: existing.id },
      data: { status }
    });
  } else {
    record = await prisma.employeeAttendance.create({
      data: {
        employeeId,
        date: targetDate,
        status,
        checkIn: status === 'PRESENT' || status === 'HALF_DAY' ? new Date() : null,
      }
    });
  }

  res.json(new ApiResponse(200, record, 'Attendance marked successfully'));
});
