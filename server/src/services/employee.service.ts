import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import type { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
      salaryPayments: { take: 12, orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!employee) throw new ApiError(404, 'Employee profile not found');
  return employee;
};

export const create = async (payload: any, userId: string) => {
  const { idempotencyKey, name, email, phone, role, department, salary, dailyRate, payrollType, workingDaysOverride, workingHoursOverride, payrollStartDate, overtimeEligible } = payload;
  
  const hashedPassword = await bcrypt.hash('Vastu@123', 12);
  
  let userRole: Role = 'ENGINEER';
  if (role === 'ACCOUNTANT') userRole = 'ACCOUNTANT';
  if (role === 'ADMIN') userRole = 'ADMIN';

  const employee = await prisma.employee.create({
    data: {
      department: department || 'Operations',
      designation: role || 'Staff',
      salary: salary ? Number(salary) : null,
      dailyRate: dailyRate ? Number(dailyRate) : null,
      payrollType: payrollType || 'ATTENDANCE_BASED',
      workingDaysOverride: workingDaysOverride ? Number(workingDaysOverride) : null,
      workingHoursOverride: workingHoursOverride ? Number(workingHoursOverride) : null,
      payrollStartDate: payrollStartDate ? new Date(payrollStartDate) : null,
      overtimeEligible: overtimeEligible !== undefined ? Boolean(overtimeEligible) : true,
      user: {
        create: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: userRole,
          forcePasswordChange: true
        }
      }
    },
    include: {
      user: true
    }
  });

  eventBus.publishMutation('Employee', 'CREATE', userId, employee.id, idempotencyKey || crypto.randomUUID(), employee, null);
  return employee;
};

export const update = async (id: string, payload: any, userId: string) => {
  const { idempotencyKey, name, email, phone, designation, department, salary, dailyRate, status, ...rest } = payload;
  const oldEmployee = await getById(id);
  
  const updateData: any = { ...rest };
  if (designation !== undefined) updateData.designation = designation;
  if (department !== undefined) updateData.department = department;
  if (salary !== undefined) updateData.salary = salary;
  if (dailyRate !== undefined) updateData.dailyRate = dailyRate;
  
  if (name !== undefined || email !== undefined || phone !== undefined || status !== undefined) {
    updateData.user = {
      update: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { isActive: status === 'ACTIVE' })
      }
    };
  }

  const employee = await prisma.employee.update({ where: { id }, data: updateData });
  eventBus.publishMutation('Employee', 'UPDATE', userId, id, idempotencyKey || crypto.randomUUID(), employee, oldEmployee);
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
export const requestLeave = async (payload: Prisma.LeaveUncheckedCreateInput & { idempotencyKey?: string }) => {
  const { idempotencyKey, ...data } = payload;
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

export const createDailyReport = async (payload: Prisma.DailyReportUncheckedCreateInput & { idempotencyKey?: string }) => {
  const { idempotencyKey, ...data } = payload;
  return prisma.dailyReport.create({ data });
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

export const paySalary = async (payload: Prisma.SalaryPaymentUncheckedCreateInput & { idempotencyKey?: string; accountId?: string }, userId: string) => {
  const { idempotencyKey, accountId, ...data } = payload;
  
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.salaryPayment.create({ data });
    
    if (created.status === 'PAID' && accountId) {
      const { postJournalEntry } = await import('./journal.service.js');
      
      // Post Ledger Entry
      await postJournalEntry({
        entryDate: created.paymentDate,
        description: `Salary Payment for ${created.paymentMonth}/${created.paymentYear} - ${created.reference || ''}`,
        referenceId: created.id,
        referenceType: 'SALARY_PAYMENT',
        createdById: userId,
        lines: [
          { accountId: null, debitAmount: Number(created.amount), creditAmount: 0, description: 'Salary Expense' },
          { accountId: accountId, debitAmount: 0, creditAmount: Number(created.amount), description: 'Bank/Cash Outflow' }
        ]
      }, tx);

      // Create Expense Record to show in UI
      await tx.expense.create({
        data: {
          type: 'SALARY',
          amount: created.amount,
          paymentDate: created.paymentDate,
          paymentMethod: created.paymentMethod,
          accountId: accountId,
          description: `Salary Payment - ${created.paymentMonth}/${created.paymentYear}`,
          remarks: created.reference,
          createdById: userId,
        }
      });
    }
    
    return created;
  });

  eventBus.publishMutation('SalaryPayment', 'CREATE', userId, payment.id, idempotencyKey || crypto.randomUUID(), payment, null);
  return payment;
};
