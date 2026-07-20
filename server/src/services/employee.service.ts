import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma } from '@prisma/client';

export const list = async () => {
  const employees = await prisma.employee.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      },
      _count: { select: { leaves: true } },
    },
  });
  return { data: employees };
};

export const getById = async (id: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } },
      leaves: { take: 20, orderBy: { createdAt: 'desc' } },
      attendance: { take: 31, orderBy: { date: 'desc' } },
      salaryPayments: { take: 12, orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!employee) throw new ApiError(404, 'Employee profile not found');
  return employee;
};

export const create = async (data: Prisma.EmployeeUncheckedCreateInput, userId: string) => {
  const employee = await prisma.employee.create({ data });
  eventBus.publishMutation('Employee', 'CREATE', userId, employee.id, crypto.randomUUID() || crypto.randomUUID(), employee, null);
  return employee;
};

export const update = async (id: string, data: Prisma.EmployeeUpdateInput, userId: string) => {
  const oldEmployee = await getById(id);
  const employee = await prisma.employee.update({ where: { id }, data });
  eventBus.publishMutation('Employee', 'UPDATE', userId, id, crypto.randomUUID() || crypto.randomUUID(), employee, oldEmployee);
  return employee;
};

export const grantTempAdmin = async (userId: string, durationHours: number, pages: string[]) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  
  const tempAdminUntil = durationHours > 0 ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
  const tempAdminPages = durationHours > 0 ? pages : [];
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { tempAdminUntil, tempAdminPages },
  });
  
  return {
    tempAdminUntil: updatedUser.tempAdminUntil,
    tempAdminPages: updatedUser.tempAdminPages,
  };
};

// Leave management
export const requestLeave = async (data: Prisma.LeaveUncheckedCreateInput) => {
  return prisma.leave.create({ data });
};

export const updateLeaveStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
  return prisma.leave.update({ where: { id }, data: { status } });
};

// Daily Reports
export const listDailyReports = async (params: { projectId?: string; userId?: string; date?: string }) => {
  const { projectId, userId, date } = params;
  return prisma.dailyReport.findMany({
    where: {
      ...(projectId && { projectId }),
      ...(userId && { userId }),
      ...(date && { date: new Date(date) }),
    },
    include: {
      user: { select: { name: true, role: true } },
      project: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });
};

export const createDailyReport = async (data: Prisma.DailyReportUncheckedCreateInput) => {
  return prisma.dailyReport.create({ data });
};

// Attendance
export const getAttendance = async (employeeId: string, month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  return prisma.employeeAttendance.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'asc' }
  });
};

// Salaries
export const listSalaries = async () => {
  return prisma.salaryPayment.findMany({
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } }
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  });
};

export const paySalary = async (data: Prisma.SalaryPaymentUncheckedCreateInput, userId: string) => {
  const payment = await prisma.salaryPayment.create({ data });
  eventBus.publishMutation('SalaryPayment', 'CREATE', userId, payment.id, crypto.randomUUID() || crypto.randomUUID(), payment, null);
  return payment;
};
