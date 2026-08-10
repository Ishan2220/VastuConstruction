import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { PersonType, AttendanceStatus } from '@prisma/client';
import { PayrollEngine } from './payrollEngine.service.js';
import { getSettings } from './payroll.service.js';

export const getAttendanceByDate = async (date: string, type: 'EMPLOYEE' | 'LABOR') => {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0); // Strip time
  
  const now = new Date();
  const diffHours = Math.abs(targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLocked = diffHours > 48; // Lock if trying to modify more than 48 hours in past/future

  let activePeople: any[] = [];

  if (type === 'EMPLOYEE') {
    activePeople = await prisma.employee.findMany({
      where: { isArchived: false },
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });
  } else {
    activePeople = await prisma.labour.findMany({
      where: { isActive: true, deletedAt: null }
    });
  }

  const attendanceRecords = await prisma.unifiedAttendance.findMany({
    where: {
      date: targetDate,
      personType: type
    }
  });

  const people = activePeople.map(person => {
    const record = attendanceRecords.find(a => a.personId === person.id);
    
    let name = '';
    let role = '';
    
    if (type === 'EMPLOYEE') {
      name = person.user?.name || 'Unknown Employee';
      role = person.designation || person.user?.role || 'Employee';
    } else {
      name = person.name || 'Unknown Labor';
      role = person.skill || 'General';
    }

    return {
      personId: person.id,
      name,
      role,
      status: record ? record.status : null,
      overtimeHours: record ? Number(record.overtimeHours) || 0 : 0,
      absentReason: record ? record.absentReason : null
    };
  });

  return {
    date: targetDate.toISOString(),
    isLocked,
    people
  };
};

export const upsertAttendance = async (
  personId: string,
  personType: 'EMPLOYEE' | 'LABOR',
  date: string,
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT',
  overtimeHours: number = 0,
  absentReason: string | null = null,
  markedBy: string = ''
) => {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  const diffHours = Math.abs(targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours > 48) {
    throw new ApiError(403, 'Cannot modify attendance beyond a 48-hour window from today');
  }
  
  if (personType === 'EMPLOYEE') {
    const isLocked = await PayrollEngine.isPayrollLocked(personId, targetDate);
    if (isLocked) {
      throw new ApiError(403, 'Payroll for this period is already approved or locked. Attendance cannot be modified.');
    }
  }

  const finalOvertime = status === 'ABSENT' ? 0 : overtimeHours;
  const finalReason = status === 'ABSENT' ? (absentReason || null) : null;

  const att = await prisma.unifiedAttendance.upsert({
    where: {
      personId_personType_date: {
        personId,
        personType,
        date: targetDate
      }
    },
    update: {
      status,
      overtimeHours: finalOvertime,
      absentReason: finalReason,
      markedBy
    },
    create: {
      personId,
      personType,
      date: targetDate,
      status,
      overtimeHours: finalOvertime,
      absentReason: finalReason,
      markedBy
    }
  });

  if (personType === 'EMPLOYEE') {
    const employee = await prisma.employee.findUnique({ where: { id: personId } });
    if (employee && (employee.salary || employee.dailyRate)) {
      const settings = await getSettings();
      const stdHours = employee.workingHoursOverride || settings.standardWorkingHours;
      let workingHours = 0;
      if (status === 'PRESENT') workingHours = stdHours + finalOvertime;
      else if (status === 'HALF_DAY') workingHours = (stdHours / 2) + finalOvertime;
      
      const workLog = await PayrollEngine.calculateDailyWorkLog(personId, targetDate, workingHours, markedBy);
      if (workLog) {
        await prisma.unifiedAttendance.update({
          where: { id: att.id },
          data: {
            workingHours,
            dailySalaryEarned: workLog.finalDaySalary,
            dailyOvertimeAmount: workLog.overtimeAmount
          }
        });
      }
    }
  }

  return att;
};

export const bulkMarkPresent = async (
  date: string,
  personType: 'EMPLOYEE' | 'LABOR',
  updates: Array<{ personId: string; status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'LEAVE' | 'HOLIDAY'; overtimeHours?: number; absentReason?: string }>,
  markedBy: string
) => {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  const diffHours = Math.abs(targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours > 48) {
    throw new ApiError(403, 'Cannot modify attendance beyond a 48-hour window from today');
  }

  // Step 1: Pre-Validation
  if (personType === 'EMPLOYEE') {
    for (const update of updates) {
      const isLocked = await PayrollEngine.isPayrollLocked(update.personId, targetDate);
      if (isLocked) {
        throw new ApiError(403, `Payroll for employee ${update.personId} is locked. Attendance cannot be modified.`);
      }
    }
  }

  // Step 2 & 3 & 4: Transaction Atomicity
  let count = 0;
  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      const finalOvertime = update.status === 'ABSENT' || update.status === 'LEAVE' || update.status === 'HOLIDAY' ? 0 : (update.overtimeHours || 0);
      const finalReason = update.status === 'ABSENT' ? (update.absentReason || null) : null;
      
      const att = await tx.unifiedAttendance.upsert({
        where: {
          personId_personType_date: {
            personId: update.personId,
            personType,
            date: targetDate
          }
        },
        update: {
          status: update.status,
          overtimeHours: finalOvertime,
          absentReason: finalReason,
          markedBy
        },
        create: {
          personId: update.personId,
          personType,
          date: targetDate,
          status: update.status,
          overtimeHours: finalOvertime,
          absentReason: finalReason,
          markedBy
        }
      });

      if (personType === 'EMPLOYEE') {
        const employee = await tx.employee.findUnique({ where: { id: update.personId } });
        if (employee && (employee.salary || employee.dailyRate)) {
          const settings = await tx.payrollSettings.findFirst() || await getSettings();
          const stdHours = employee.workingHoursOverride || settings.standardWorkingHours;
          let workingHours = 0;
          if (update.status === 'PRESENT') workingHours = stdHours + finalOvertime;
          else if (update.status === 'HALF_DAY') workingHours = (stdHours / 2) + finalOvertime;
          
          const workLog = await PayrollEngine.calculateDailyWorkLog(update.personId, targetDate, workingHours, markedBy, tx);
          if (workLog) {
            await tx.unifiedAttendance.update({
              where: { id: att.id },
              data: {
                workingHours,
                dailySalaryEarned: workLog.finalDaySalary,
                dailyOvertimeAmount: workLog.overtimeAmount
              }
            });
          }
        }
      }

      count++;
    }
  });

  return count;
};

export const calendarSummary = async (month: string, type: 'EMPLOYEE' | 'LABOR') => {
  // month is YYYY-MM
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr) - 1; // 0-indexed for Date

  const startDate = new Date(Date.UTC(year, monthNum, 1));
  const endDate = new Date(Date.UTC(year, monthNum + 1, 0));

  let totalPeople = 0;
  if (type === 'EMPLOYEE') {
    totalPeople = await prisma.employee.count({
      where: { isArchived: false }
    });
  } else {
    totalPeople = await prisma.labour.count({
      where: { isActive: true, deletedAt: null }
    });
  }

  const attendanceRecords = await prisma.unifiedAttendance.findMany({
    where: {
      personType: type,
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const summary: Record<string, { marked: number; total: number }> = {};

  attendanceRecords.forEach(record => {
    const dateStr = record.date.toISOString().split('T')[0];
    if (!summary[dateStr]) {
      summary[dateStr] = { marked: 0, total: totalPeople };
    }
    summary[dateStr].marked += 1;
  });

  return summary;
};
