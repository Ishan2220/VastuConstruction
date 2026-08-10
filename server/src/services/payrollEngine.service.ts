import { prisma } from '../config/database.js';
import { getSettings } from './payroll.service.js';
import { ApiError } from '../utils/ApiError.js';
import { postJournalEntry } from './journal.service.js';

export class PayrollEngine {
  
  /**
   * Calculate daily salary for a specific employee on a specific date based on worked hours.
   * 
   * PROPORTIONAL OVERTIME FORMULA:
   *   Daily Salary = Monthly Salary ÷ Configured Working Days
   *   Hours Ratio  = Worked Hours  ÷ Standard Working Hours
   *   Day Salary   = Daily Salary  × Hours Ratio
   * 
   * Example (₹15,000/mo, 26 days, 8 std hrs):
   *   Daily = ₹576.92
   *   8hrs  → 1.000× → ₹576.92
   *   9hrs  → 1.125× → ₹649.04
   *   10hrs → 1.250× → ₹721.15
   *   11hrs → 1.375× → ₹793.27
   *   12hrs → 1.500× → ₹865.38
   */
  static async calculateDailyWorkLog(
    employeeId: string, 
    date: Date, 
    workingHours: number, 
    calculatedById: string,
    tx: any = prisma
  ) {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) throw new ApiError(404, 'Employee not found');
    if (!employee.salary && !employee.dailyRate) return null; // Unpaid or invalid employee

    const settings = await tx.payrollSettings.findFirst() || await getSettings();

    // Dynamic Working Days (Total days in month - 4 holidays)
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const standardDays = employee.workingDaysOverride || (totalDaysInMonth - 4);

    // Standard Hours defaulted to 8
    const standardHours = employee.workingHoursOverride || 8;

    // Calculate base daily salary
    let dailySalaryBase = 0;
    if (employee.dailyRate) {
      dailySalaryBase = Number(employee.dailyRate);
    } else {
      dailySalaryBase = Number(employee.salary) / standardDays;
    }

    // Proportional calculation — no hardcoded multipliers
    // hoursRatio dynamically derives the multiplier from configured standard hours
    const hoursRatio = workingHours / standardHours;
    let finalDaySalary = 0;
    let overtimeAmount = 0;
    let overtimeHours = 0;

    if (workingHours <= standardHours) {
      // Under or exact standard hours — proportional pay
      finalDaySalary = dailySalaryBase * hoursRatio;
    } else {
      // Overtime — proportional pay for ALL hours worked
      if (employee.overtimeEligible) {
        overtimeHours = workingHours - standardHours;
        finalDaySalary = dailySalaryBase * hoursRatio;
        overtimeAmount = finalDaySalary - dailySalaryBase; // The extra earned beyond base
      } else {
        finalDaySalary = dailySalaryBase; // Capped at 100% if not overtime eligible
      }
    }

    // Save DailyWorkLog with the actual proportional multiplier
    const log = await tx.dailyWorkLog.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date
        }
      },
      update: {
        workingHours,
        standardHours,
        overtimeHours,
        dailySalary: dailySalaryBase,
        overtimeMultiplier: hoursRatio,
        overtimeAmount,
        finalDaySalary,
        calculatedById
      },
      create: {
        employeeId,
        date,
        workingHours,
        standardHours,
        overtimeHours,
        dailySalary: dailySalaryBase,
        overtimeMultiplier: hoursRatio,
        overtimeAmount,
        finalDaySalary,
        calculatedById
      }
    });

    return log;
  }

  /**
   * Generates or recalculates the payroll for a given month and year
   */
  static async generateMonthlyPayroll(employeeId: string, month: number, year: number) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    
    if (!employee || (!employee.salary && !employee.dailyRate)) {
      throw new ApiError(404, 'Employee or salary details not found');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await prisma.unifiedAttendance.findMany({
      where: {
        personId: employeeId,
        personType: 'EMPLOYEE',
        date: { gte: startDate, lte: endDate }
      }
    });

    const workLogs = await prisma.dailyWorkLog.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate }
      }
    });

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalWorkingHours = 0;
    let totalOvertimeHours = 0;
    let overtimeEarnings = 0;
    let baseSalary = 0;

    const settings = await getSettings();
    
    // Dynamic Working Days (Total days in month - 4 holidays)
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const workingDays = employee.workingDaysOverride || (totalDaysInMonth - 4);
    
    // Standard Hours defaulted to 8
    const standardHours = employee.workingHoursOverride || 8;

    // Calculate the base daily salary (used for proportional calculations)
    let dailySalaryBase = 0;
    if (employee.dailyRate) {
      dailySalaryBase = Number(employee.dailyRate);
    } else {
      dailySalaryBase = Number(employee.salary) / workingDays;
    }

    for (const att of attendances) {
      if (att.status === 'PRESENT') presentDays++;
      else if (att.status === 'HALF_DAY') halfDays++;
      else if (att.status === 'ABSENT') absentDays++;
    }

    // Fixed / Attendance Based Switch
    if (employee.payrollType === 'FIXED') {
      baseSalary = employee.salary ? Number(employee.salary) : dailySalaryBase * workingDays;
    } else {
      // Attendance based — monthly payroll = sum of each day's calculated salary
      if (workLogs.length === 0 && attendances.length === 0) {
        // If no attendance is logged at all, do NOT assume full attendance.
        throw new ApiError(400, 'No attendance records found for this period. Mark attendance before generating payroll.');
      } else {
        const formatUtcDate = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        // Map workLogs by date to avoid double counting
        const workLogDates = new Set(workLogs.map(l => formatUtcDate(l.date)));
        
        // Add up logged daily work logs
        for (const log of workLogs) {
          totalWorkingHours += log.workingHours;
          totalOvertimeHours += log.overtimeHours;
          overtimeEarnings += Number(log.overtimeAmount);
          baseSalary += (Number(log.finalDaySalary) - Number(log.overtimeAmount));
        }

        // Add up attendances that DO NOT have a corresponding work log
        for (const att of attendances) {
          const attDateStr = formatUtcDate(att.date);
          if (!workLogDates.has(attDateStr)) {
            if (att.status === 'PRESENT') {
              baseSalary += dailySalaryBase;
              totalWorkingHours += standardHours;
            } else if (att.status === 'HALF_DAY') {
              baseSalary += (dailySalaryBase / 2);
              totalWorkingHours += (standardHours / 2);
            }
          }
        }
      }
    }

    // Fetch any manual adjustments for this month via the payroll record
    const existingPayroll = await prisma.payroll.findFirst({
      where: { employeeId, month, year }
    });
    const adjustments = existingPayroll ? await prisma.payrollAdjustment.findMany({
      where: { payrollId: existingPayroll.id }
    }) : [];

    const totalAdjustments = adjustments.reduce((sum, adj) => {
      if (adj.type === 'BONUS' || adj.type === 'INCENTIVE' || adj.type === 'ARREARS' || adj.type === 'CORRECTION') return sum + Number(adj.amount);
      if (adj.type === 'DEDUCTION' || adj.type === 'PENALTY' || adj.type === 'ADVANCE_DEDUCTION') return sum - Number(adj.amount);
      return sum;
    }, 0);

    const grossSalary = baseSalary + overtimeEarnings;
    const netSalary = grossSalary + totalAdjustments;

    const dailySalary = dailySalaryBase;
    const monthlySalaryValue = employee.salary ? employee.salary : dailySalaryBase * workingDays;
    
    // Auto-calculate attendance deductions
    const theoreticalFullSalary = employee.salary ? Number(employee.salary) : dailySalaryBase * workingDays;
    const attendanceDeductions = Math.max(0, theoreticalFullSalary - baseSalary);

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_month_year: { employeeId, month, year } },
      update: {
        monthlySalary: monthlySalaryValue,
        workingDays,
        dailySalary,
        presentDays,
        halfDays,
        absentDays,
        totalWorkingHours,
        totalOvertimeHours,
        overtimeEarnings,
        baseSalary,
        attendanceDeductions,
        grossSalary,
        netSalary,
      },
      create: {
        employeeId,
        month,
        year,
        monthlySalary: monthlySalaryValue,
        workingDays,
        dailySalary,
        presentDays,
        halfDays,
        absentDays,
        totalWorkingHours,
        totalOvertimeHours,
        overtimeEarnings,
        baseSalary,
        attendanceDeductions,
        grossSalary,
        netSalary,
        status: 'CALCULATED'
      }
    });

    return payroll;
  }

  /**
   * Approve a calculated payroll
   */
  static async approvePayroll(payrollId: string, approvedById: string) {
    const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new ApiError(404, 'Payroll not found');
    if (payroll.status !== 'CALCULATED') throw new ApiError(400, 'Only CALCULATED payrolls can be approved');

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: { status: 'APPROVED', approvedById }
    });

    await prisma.payrollHistory.create({
      data: {
        payrollId,
        action: 'APPROVED',
        snapshotData: JSON.stringify(updated),
        createdById: approvedById
      }
    });

    return updated;
  }

  /**
   * Freeze a payroll (Locks it, stopping any attendance edits)
   */
  static async freezePayroll(payrollId: string, userId: string) {
    const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new ApiError(404, 'Payroll not found');
    if (payroll.status !== 'APPROVED') throw new ApiError(400, 'Only APPROVED payrolls can be frozen');

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: { status: 'LOCKED', lockedAt: new Date() }
    });

    await prisma.payrollHistory.create({
      data: {
        payrollId,
        action: 'LOCKED',
        snapshotData: JSON.stringify(updated),
        createdById: userId
      }
    });

    return updated;
  }

  /**
   * Reopen a payroll (ADMIN only)
   */
  static async reopenPayroll(payrollId: string, userId: string) {
    const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new ApiError(404, 'Payroll not found');
    if (payroll.status === 'PAID') throw new ApiError(400, 'Cannot reopen PAID payrolls');

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: { status: 'CALCULATED', lockedAt: null, approvedById: null }
    });

    await prisma.payrollHistory.create({
      data: {
        payrollId,
        action: 'REOPENED',
        snapshotData: JSON.stringify(updated),
        createdById: userId
      }
    });

    return updated;
  }

  /**
   * Pay a Payroll (Reconciliation)
   */
  static async payPayroll(payrollId: string, accountId: string, paymentMethod: string, reference: string, userId: string) {
    const payroll = await prisma.payroll.findUnique({ 
      where: { id: payrollId },
      include: { employee: { include: { user: true } } }
    });

    if (!payroll) throw new ApiError(404, 'Payroll not found');
    if (payroll.status !== 'APPROVED' && payroll.status !== 'LOCKED') throw new ApiError(400, 'Only APPROVED or LOCKED payrolls can be paid');
    
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new ApiError(404, 'Bank account not found');

      if (account.balance < payroll.netSalary) {
        throw new ApiError(400, 'Insufficient balance in selected account');
      }

      const updatedPayroll = await tx.payroll.update({
        where: { id: payrollId },
        data: { status: 'PAID' }
      });

      // Generate Salary Payment Record
      const salaryPayment = await tx.salaryPayment.create({
        data: {
          employeeId: payroll.employeeId,
          amount: payroll.netSalary,
          paymentDate: new Date(),
          paymentMonth: payroll.month,
          paymentYear: payroll.year,
          paymentMethod,
          status: 'PAID',
          reference,
        }
      });

      // Create an Expense record so it shows up in P&L and Dashboards
      const expense = await tx.expense.create({
        data: {
          type: 'SALARY',
          amount: payroll.netSalary,
          paymentDate: new Date(),
          paymentMethod,
          accountId,
          description: `Salary Payment for ${payroll.employee?.user?.name} (${payroll.month}/${payroll.year})`,
          createdById: userId
        }
      });

      // Reconcile Accounts & Ledger using proper double-entry method
      await postJournalEntry({
        entryDate: new Date(),
        description: `Salary Payment for ${payroll.employee?.user?.name} (${payroll.month}/${payroll.year})`,
        referenceId: salaryPayment.id,
        referenceType: 'SALARY',
        createdById: userId,
        lines: [
          { accountId: null, debitAmount: Number(payroll.netSalary), creditAmount: 0, description: 'Salary Expense' },
          { accountId, debitAmount: 0, creditAmount: Number(payroll.netSalary), description: 'Bank/Cash Outflow' }
        ]
      }, tx);

      await tx.payrollHistory.create({
        data: {
          payrollId,
          action: 'PAID',
          snapshotData: JSON.stringify(updatedPayroll),
          createdById: userId
        }
      });

      return updatedPayroll;
    });

    return result;
  }

  /**
   * Check if a payroll period is locked for an employee
   */
  static async isPayrollLocked(employeeId: string, date: Date, tx: any = prisma) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const payroll = await tx.payroll.findFirst({
      where: {
        employeeId,
        month,
        year,
        status: { in: ['APPROVED', 'LOCKED', 'PAID'] }
      }
    });

    return !!payroll;
  }

  /**
   * Add a payroll adjustment (bonus, deduction, etc.)
   */
  static async addAdjustment(payrollId: string, type: string, amount: number, reason: string, userId: string) {
    const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new ApiError(404, 'Payroll not found');
    if (payroll.status === 'LOCKED' || payroll.status === 'PAID') {
      throw new ApiError(400, 'Cannot adjust a locked or paid payroll');
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        payrollId,
        type,
        amount,
        reason,
        createdById: userId
      }
    });

    // Recalculate net salary
    let netChange = 0;
    if (['BONUS', 'INCENTIVE', 'ARREARS'].includes(type)) {
      netChange = amount;
    } else if (['DEDUCTION'].includes(type)) {
      netChange = -amount;
    } else if (type === 'CORRECTION') {
      netChange = amount; // Correction can be negative
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        netSalary: { increment: netChange }
      }
    });

    return { adjustment, payroll: updated };
  }

  /**
   * Delete a payroll record
   */
  static async deletePayroll(payrollId: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId }
    });

    if (!payroll) throw new ApiError(404, 'Payroll not found');
    
    // Only allow deletion if not already PAID
    if (payroll.status === 'PAID') {
      throw new ApiError(400, 'Cannot delete a paid payroll. Reverse the payment first.');
    }

    await prisma.payroll.delete({
      where: { id: payrollId }
    });

    return { message: 'Payroll deleted successfully' };
  }
}
