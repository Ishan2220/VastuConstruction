import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export const submitHeadcount = async (data: any, userId: string) => {
  const { vendorId, projectId, date, details, notes } = data;

  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (date !== todayStr) {
    throw new ApiError(403, 'Cannot modify attendance for past or future dates');
  }

  // Calculate total wage
  const totalWage = details.reduce((sum: number, detail: any) => sum + Number(detail.count) * Number(detail.rate), 0);

  // Use a transaction to create or update the attendance and details
  const result = await prisma.$transaction(async (tx) => {
    // Check if an attendance already exists for this vendor, project, and date
    let attendance = await tx.vendorAttendance.findFirst({
      where: {
        vendorId,
        projectId: projectId || null,
        date: attendanceDate,
      },
    });

    if (attendance) {
      // Update existing
      attendance = await tx.vendorAttendance.update({
        where: { id: attendance.id },
        data: {
          totalWage,
          notes,
          details: {
            deleteMany: {}, // Clear old details
            create: details.map((d: any) => ({
              categoryId: d.categoryId || null,
              customCategory: d.customCategory || null,
              count: Number(d.count),
              rate: Number(d.rate),
              amount: Number(d.count) * Number(d.rate),
            })),
          },
        },
      });
    } else {
      // Create new
      attendance = await tx.vendorAttendance.create({
        data: {
          vendorId,
          projectId: projectId || null,
          date: attendanceDate,
          totalWage,
          notes,
          details: {
            create: details.map((d: any) => ({
              categoryId: d.categoryId || null,
              customCategory: d.customCategory || null,
              count: Number(d.count),
              rate: Number(d.rate),
              amount: Number(d.count) * Number(d.rate),
            })),
          },
        },
      });
    }
    
    // Log into the expense history as an ACCRUED expense
    if (totalWage > 0) {
      // Remove any existing accrued expense for this vendor and date to prevent duplicates if edited
      await tx.expense.updateMany({
        where: {
          vendorId,
          paymentDate: attendanceDate,
          paymentMethod: 'ACCRUED',
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });

      // Create new accrued expense
      const newExpense = await tx.expense.create({
        data: {
          vendorId,
          projectId: projectId || null,
          type: 'LABOUR',
          amount: totalWage,
          paymentDate: attendanceDate,
          paymentMethod: 'ACCRUED',
          description: `Daily Labour Attendance for ${attendanceDate.toISOString().split('T')[0]}`,
          remarks: notes,
          createdById: userId,
        }
      });
      return { attendance, newExpense };
    }

    return { attendance, newExpense: null };
  });

  if (result.newExpense) {
    eventBus.publishMutation('Expense', 'CREATE', userId, result.newExpense.id, randomUUID(), result.newExpense);
  }

  return result.attendance;
};

export const getHeadcountsByDate = async (date: string) => {
  const targetDate = new Date(date);
  
  const attendances = await prisma.vendorAttendance.findMany({
    where: {
      date: targetDate,
    },
    include: {
      vendor: { select: { id: true, name: true, phone: true } },
      project: { select: { id: true, name: true } },
      details: {
        include: {
          category: { select: { name: true } },
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return attendances;
};
