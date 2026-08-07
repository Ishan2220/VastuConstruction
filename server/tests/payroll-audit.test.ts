import { prisma } from '../src/config/database.js';
import { PayrollEngine } from '../src/services/payrollEngine.service.js';
import { getSettings } from '../src/services/payroll.service.js';

// ANSI escape codes for formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Test tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testFailures: string[] = [];

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${colors.green}✓ Passed:${colors.reset} ${message}`);
  } else {
    failedTests++;
    testFailures.push(message);
    console.log(`  ${colors.red}❌ Failed:${colors.reset} ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string) {
  totalTests++;
  // Handle decimal vs number comparison
  const actVal = typeof actual === 'object' && actual !== null && 'toNumber' in actual ? (actual as any).toNumber() : actual;
  const expVal = typeof expected === 'object' && expected !== null && 'toNumber' in expected ? (expected as any).toNumber() : expected;

  const match = actVal === expVal;
  if (match) {
    passedTests++;
    console.log(`  ${colors.green}✓ Passed:${colors.reset} ${message}`);
  } else {
    failedTests++;
    const failMsg = `${message} (Expected ${expVal}, got ${actVal})`;
    testFailures.push(failMsg);
    console.log(`  ${colors.red}❌ Failed:${colors.reset} ${failMsg}`);
  }
}

(async () => {
  console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   📝 PAYROLL ENGINE COMPREHENSIVE AUDIT & VALIDATION TESTS   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Setup unique test data identifiers
  const suffix = Date.now().toString();
  const testEmail = `audit-admin-${suffix}@example.com`;
  
  let testUserId: string | null = null;
  let testEmployeeIds: string[] = [];
  let originalSettingsBackup: any = null;

  try {
    // 1. Setup global Test User (will act as calculator / approver / creator)
    console.log(`${colors.blue}🔄 Setting up test user and backing up settings...${colors.reset}`);
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: 'testpassword123',
        name: 'Payroll Auditor Admin',
        role: 'ADMIN',
      }
    });
    testUserId = testUser.id;
    console.log(`  Created test user with ID: ${testUserId}`);

    // Backup payroll settings with ID "1" if it exists
    originalSettingsBackup = await prisma.payrollSettings.findUnique({ where: { id: '1' } });
    
    // Set standard settings: 26 working days, 8 standard working hours
    await prisma.payrollSettings.upsert({
      where: { id: '1' },
      update: { standardWorkingDays: 26, standardWorkingHours: 8 },
      create: { id: '1', standardWorkingDays: 26, standardWorkingHours: 8 }
    });
    console.log(`  Configured standard settings (Days: 26, Hours: 8)`);

    // Helper to register employee for cleanup
    const registerEmployee = (empId: string) => {
      testEmployeeIds.push(empId);
      return empId;
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 1: BASE DAILY SALARY & DAILY RATE CALCULATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.yellow}--- Test Suite 1: Base Daily Salary & Daily Rate ---${colors.reset}`);

    // Scenario 1A: Monthly salary (e.g. 26,000) with no working days override
    const user1A = await prisma.user.create({
      data: { email: `emp-1a-${suffix}@example.com`, password: 'pwd', name: 'Emp 1A', role: 'ENGINEER' }
    });
    const emp1A = await prisma.employee.create({
      data: { userId: user1A.id, salary: 26000, dailyRate: null, workingDaysOverride: null, workingHoursOverride: null }
    });
    registerEmployee(emp1A.id);

    const log1A = await PayrollEngine.calculateDailyWorkLog(emp1A.id, new Date(2026, 7, 1), 8, testUserId);
    assertEq(log1A?.dailySalary, 1000, 'Scenario 1A: Daily salary base should be salary/26 (26000 / 26 = 1000)');

    // Scenario 1B: Monthly salary (e.g. 30,000) with working days override (e.g. 30)
    const user1B = await prisma.user.create({
      data: { email: `emp-1b-${suffix}@example.com`, password: 'pwd', name: 'Emp 1B', role: 'ENGINEER' }
    });
    const emp1B = await prisma.employee.create({
      data: { userId: user1B.id, salary: 30000, dailyRate: null, workingDaysOverride: 30, workingHoursOverride: null }
    });
    registerEmployee(emp1B.id);

    const log1B = await PayrollEngine.calculateDailyWorkLog(emp1B.id, new Date(2026, 7, 1), 8, testUserId);
    assertEq(log1B?.dailySalary, 1000, 'Scenario 1B: Daily salary base should be salary/override (30000 / 30 = 1000)');

    // Scenario 1C: Daily rate configuration overrides monthly salary settings
    const user1C = await prisma.user.create({
      data: { email: `emp-1c-${suffix}@example.com`, password: 'pwd', name: 'Emp 1C', role: 'ENGINEER' }
    });
    const emp1C = await prisma.employee.create({
      data: { userId: user1C.id, salary: 26000, dailyRate: 1500, workingDaysOverride: 26, workingHoursOverride: null }
    });
    registerEmployee(emp1C.id);

    const log1C = await PayrollEngine.calculateDailyWorkLog(emp1C.id, new Date(2026, 7, 1), 8, testUserId);
    assertEq(log1C?.dailySalary, 1500, 'Scenario 1C: Base daily salary should equal dailyRate (1500) directly');


    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 2: PROPORTIONAL OVERTIME CALCULATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.yellow}--- Test Suite 2: Proportional Overtime Calculations ---${colors.reset}`);

    // Base Employee for Overtime (Eligible)
    const user2A = await prisma.user.create({
      data: { email: `emp-2a-${suffix}@example.com`, password: 'pwd', name: 'Emp 2A', role: 'ENGINEER' }
    });
    const emp2A = await prisma.employee.create({
      data: { userId: user2A.id, salary: 26000, overtimeEligible: true }
    });
    registerEmployee(emp2A.id);

    // Scenario 2A: Exact standard hours (8 hrs worked on standard 8 hrs)
    const log2A = await PayrollEngine.calculateDailyWorkLog(emp2A.id, new Date(2026, 7, 1), 8, testUserId);
    assertEq(log2A?.finalDaySalary, 1000, 'Scenario 2A: Exact standard hours final salary should be base daily salary (1000)');
    assertEq(log2A?.overtimeHours, 0, 'Scenario 2A: Overtime hours should be 0');
    assertEq(log2A?.overtimeAmount, 0, 'Scenario 2A: Overtime amount should be 0');
    assertEq(log2A?.overtimeMultiplier, 1.0, 'Scenario 2A: Overtime multiplier should be 1.0');

    // Scenario 2B: Under standard hours (4 hrs worked on standard 8 hrs)
    const log2B = await PayrollEngine.calculateDailyWorkLog(emp2A.id, new Date(2026, 7, 2), 4, testUserId);
    assertEq(log2B?.finalDaySalary, 500, 'Scenario 2B: Under standard hours final salary should be proportional (1000 * 4/8 = 500)');
    assertEq(log2B?.overtimeHours, 0, 'Scenario 2B: Under standard hours overtime hours should be 0');
    assertEq(log2B?.overtimeAmount, 0, 'Scenario 2B: Under standard hours overtime amount should be 0');
    assertEq(log2B?.overtimeMultiplier, 0.5, 'Scenario 2B: Under standard hours overtime multiplier should be 0.5');

    // Scenario 2C: Overtime worked, employee IS eligible (10 hrs worked on standard 8 hrs)
    const log2C = await PayrollEngine.calculateDailyWorkLog(emp2A.id, new Date(2026, 7, 3), 10, testUserId);
    assertEq(log2C?.finalDaySalary, 1250, 'Scenario 2C: Overtime eligible final salary should be proportional (1000 * 10/8 = 1250)');
    assertEq(log2C?.overtimeHours, 2, 'Scenario 2C: Overtime hours should be 2');
    assertEq(log2C?.overtimeAmount, 250, 'Scenario 2C: Overtime amount should be proportional difference (1250 - 1000 = 250)');
    assertEq(log2C?.overtimeMultiplier, 1.25, 'Scenario 2C: Overtime multiplier should be 1.25');

    // Scenario 2D: Overtime worked, employee is NOT eligible (10 hrs worked on standard 8 hrs)
    const user2D = await prisma.user.create({
      data: { email: `emp-2d-${suffix}@example.com`, password: 'pwd', name: 'Emp 2D', role: 'ENGINEER' }
    });
    const emp2D = await prisma.employee.create({
      data: { userId: user2D.id, salary: 26000, overtimeEligible: false }
    });
    registerEmployee(emp2D.id);

    const log2D = await PayrollEngine.calculateDailyWorkLog(emp2D.id, new Date(2026, 7, 1), 10, testUserId);
    assertEq(log2D?.finalDaySalary, 1000, 'Scenario 2D: Ineligible final salary should be capped at base daily salary (1000)');
    assertEq(log2D?.overtimeHours, 0, 'Scenario 2D: Ineligible overtime hours should be 0');
    assertEq(log2D?.overtimeAmount, 0, 'Scenario 2D: Ineligible overtime amount should be 0');
    assertEq(log2D?.overtimeMultiplier, 1.25, 'Scenario 2D: Ineligible overtime multiplier remains hours ratio (1.25)');


    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 3: DAILYWORKLOG UPDATES / UPSERTING
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.yellow}--- Test Suite 3: DailyWorkLog Updates (Upsert) ---${colors.reset}`);

    const user3 = await prisma.user.create({
      data: { email: `emp-3-${suffix}@example.com`, password: 'pwd', name: 'Emp 3', role: 'ENGINEER' }
    });
    const emp3 = await prisma.employee.create({
      data: { userId: user3.id, salary: 26000, overtimeEligible: true }
    });
    registerEmployee(emp3.id);

    const testDate = new Date(2026, 7, 15);
    // Create first log
    const initialLog = await PayrollEngine.calculateDailyWorkLog(emp3.id, testDate, 8, testUserId);
    assertEq(initialLog?.workingHours, 8, 'Initial log working hours should be 8');
    assertEq(initialLog?.finalDaySalary, 1000, 'Initial log final salary should be 1000');

    // Recalculate same date with different hours (12 hours)
    const updatedLog = await PayrollEngine.calculateDailyWorkLog(emp3.id, testDate, 12, testUserId);
    assertEq(updatedLog?.workingHours, 12, 'Updated log working hours should be updated to 12');
    assertEq(updatedLog?.overtimeHours, 4, 'Updated log overtime hours should be updated to 4');
    assertEq(updatedLog?.finalDaySalary, 1500, 'Updated log final salary should be updated to 1500');

    // Query DB directly to make sure only ONE record exists for the composite key
    const allLogs = await prisma.dailyWorkLog.findMany({ where: { employeeId: emp3.id, date: testDate } });
    assertEq(allLogs.length, 1, 'Only one DailyWorkLog database row should exist for (employeeId, date)');


    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 4: FIXED PAYROLL TYPE MONTHLY CALCULATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.yellow}--- Test Suite 4: FIXED Payroll Type Monthly Calculations ---${colors.reset}`);

    const user4 = await prisma.user.create({
      data: { email: `emp-4-${suffix}@example.com`, password: 'pwd', name: 'Emp 4 (Fixed)', role: 'ENGINEER' }
    });
    const emp4 = await prisma.employee.create({
      data: { userId: user4.id, salary: 35000, payrollType: 'FIXED', overtimeEligible: true }
    });
    registerEmployee(emp4.id);

    // Create some work logs with overtime (to verify FIXED ignores logs for base, hours, and overtime)
    await PayrollEngine.calculateDailyWorkLog(emp4.id, new Date(2026, 7, 1), 10, testUserId);
    await PayrollEngine.calculateDailyWorkLog(emp4.id, new Date(2026, 7, 2), 12, testUserId);

    // Generate monthly payroll for August 2026
    const payrollFixed = await PayrollEngine.generateMonthlyPayroll(emp4.id, 8, 2026);
    assertEq(payrollFixed.baseSalary, 35000, 'FIXED type base salary should always equal full monthly salary (35000)');
    assertEq(payrollFixed.overtimeEarnings, 0, 'FIXED type overtime earnings should be ignored/remain 0');
    assertEq(payrollFixed.attendanceDeductions, 0, 'FIXED type attendance deductions should be 0');
    assertEq(payrollFixed.netSalary, 35000, 'FIXED type net salary should initially match base salary (35000)');

    // Test adjustments
    console.log(`  Adding manual adjustments for fixed payroll...`);
    const { payroll: adjusted1 } = await PayrollEngine.addAdjustment(payrollFixed.id, 'BONUS', 3000, 'Project completed early', testUserId);
    assertEq(adjusted1.netSalary, 38000, 'Net salary after BONUS adjustment of 3000 should be 38000');

    const { payroll: adjusted2 } = await PayrollEngine.addAdjustment(payrollFixed.id, 'DEDUCTION', 1000, 'Laptop repair', testUserId);
    assertEq(adjusted2.netSalary, 37000, 'Net salary after DEDUCTION adjustment of 1000 should be 37000');


    // ═════════════════════════════════════════════════════════════════════════
    // TEST SUITE 5: ATTENDANCE PAYROLL TYPE MONTHLY CALCULATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.yellow}--- Test Suite 5: ATTENDANCE Payroll Type Monthly Calculations ---${colors.reset}`);

    // Scenario 5A: Calculations based on a sum of DailyWorkLogs
    const user5A = await prisma.user.create({
      data: { email: `emp-5a-${suffix}@example.com`, password: 'pwd', name: 'Emp 5A (Attendance)', role: 'ENGINEER' }
    });
    const emp5A = await prisma.employee.create({
      data: { userId: user5A.id, salary: 26000, payrollType: 'ATTENDANCE_BASED', overtimeEligible: true }
    });
    registerEmployee(emp5A.id);

    // Create 3 DailyWorkLogs:
    // Day 1: 8 hours (standard) -> base: 1000, overtime: 0, final: 1000
    // Day 2: 10 hours (overtime) -> base: 1000, overtime: 250, final: 1250
    // Day 3: 4 hours (short) -> base: 500, overtime: 0, final: 500
    await PayrollEngine.calculateDailyWorkLog(emp5A.id, new Date(2026, 7, 1), 8, testUserId);
    await PayrollEngine.calculateDailyWorkLog(emp5A.id, new Date(2026, 7, 2), 10, testUserId);
    await PayrollEngine.calculateDailyWorkLog(emp5A.id, new Date(2026, 7, 3), 4, testUserId);

    const payrollAttendanceLogs = await PayrollEngine.generateMonthlyPayroll(emp5A.id, 8, 2026);
    // Base salary calculation for ATTENDANCE type: sum(finalDaySalary - overtimeAmount)
    // Day 1: 1000 - 0 = 1000
    // Day 2: 1250 - 250 = 1000
    // Day 3: 500 - 0 = 500
    // Total Base Salary = 2500
    // Total Overtime Earnings = 250
    assertEq(payrollAttendanceLogs.baseSalary, 2500, 'Scenario 5A: Base salary should sum up work log base components (2500)');
    assertEq(payrollAttendanceLogs.overtimeEarnings, 250, 'Scenario 5A: Overtime earnings should sum up work log overtime components (250)');
    assertEq(payrollAttendanceLogs.grossSalary, 2750, 'Scenario 5A: Gross salary should be base + overtime (2750)');
    assertEq(payrollAttendanceLogs.attendanceDeductions, 23250, 'Scenario 5A: Attendance deduction should be full salary - gross salary (26000 - 2500 - 250 = 23250)');

    // Scenario 5B: No logs or attendances exist for the month
    // In this case, the engine defaults to standard working days and full salary
    const user5B = await prisma.user.create({
      data: { email: `emp-5b-${suffix}@example.com`, password: 'pwd', name: 'Emp 5B (No logs)', role: 'ENGINEER' }
    });
    const emp5B = await prisma.employee.create({
      data: { userId: user5B.id, salary: 26000, payrollType: 'ATTENDANCE_BASED', overtimeEligible: true }
    });
    registerEmployee(emp5B.id);

    const payrollNoLogs = await PayrollEngine.generateMonthlyPayroll(emp5B.id, 8, 2026);
    assertEq(payrollNoLogs.baseSalary, 26000, 'Scenario 5B: No logs base salary should default to standard working days * daily base (26000)');
    assertEq(payrollNoLogs.overtimeEarnings, 0, 'Scenario 5B: No logs overtime earnings should default to 0');
    assertEq(payrollNoLogs.attendanceDeductions, 0, 'Scenario 5B: No logs attendance deduction should be 0');

    // Scenario 5C: Mixed DailyWorkLogs and UnifiedAttendance records without logs
    // The engine should add work logs, and for attendances on other dates, add dailySalaryBase (PRESENT) or dailySalaryBase/2 (HALF_DAY)
    const user5C = await prisma.user.create({
      data: { email: `emp-5c-${suffix}@example.com`, password: 'pwd', name: 'Emp 5C (Mixed)', role: 'ENGINEER' }
    });
    const emp5C = await prisma.employee.create({
      data: { userId: user5C.id, salary: 26000, payrollType: 'ATTENDANCE_BASED', overtimeEligible: true }
    });
    registerEmployee(emp5C.id);

    const date1 = new Date(2026, 7, 1);
    const date2 = new Date(2026, 7, 2);
    const date3 = new Date(2026, 7, 3);

    // Day 1 has a DailyWorkLog (10 hours, standard 8 hours, daily base = 1000)
    // base: 1000, overtime: 250
    await PayrollEngine.calculateDailyWorkLog(emp5C.id, date1, 10, testUserId);
    
    // Day 1 also has a UnifiedAttendance (PRESENT) — should be ignored for double counting
    await prisma.unifiedAttendance.create({
      data: { personId: emp5C.id, personType: 'EMPLOYEE', date: date1, status: 'PRESENT', markedBy: testUserId }
    });

    // Day 2 has UnifiedAttendance PRESENT (no DailyWorkLog)
    // base salary increment = 1000
    await prisma.unifiedAttendance.create({
      data: { personId: emp5C.id, personType: 'EMPLOYEE', date: date2, status: 'PRESENT', markedBy: testUserId }
    });

    // Day 3 has UnifiedAttendance HALF_DAY (no DailyWorkLog)
    // base salary increment = 500
    await prisma.unifiedAttendance.create({
      data: { personId: emp5C.id, personType: 'EMPLOYEE', date: date3, status: 'HALF_DAY', markedBy: testUserId }
    });

    const payrollMixed = await PayrollEngine.generateMonthlyPayroll(emp5C.id, 8, 2026);
    // Expected Base Salary = 1000 (Day 1 work log) + 1000 (Day 2 PRESENT) + 500 (Day 3 HALF_DAY) = 2500
    // Expected Overtime Earnings = 250 (Day 1 work log)
    // Expected Gross Salary = 2750
    assertEq(payrollMixed.baseSalary, 2500, 'Scenario 5C: Mixed base salary should sum logs plus attendances without double counting (2500)');
    assertEq(payrollMixed.overtimeEarnings, 250, 'Scenario 5C: Mixed overtime earnings should contain only work log overtime (250)');
    assertEq(payrollMixed.grossSalary, 2750, 'Scenario 5C: Mixed gross salary should be 2750');

  } catch (err: any) {
    console.error(`\n${colors.bold}${colors.red}❌ Unexpected error during payroll audit tests:${colors.reset}`, err);
    testFailures.push(`Execution error: ${err.message}`);
  } finally {
    // ═════════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.blue}🧹 Cleaning up test database records...${colors.reset}`);
    try {
      if (testEmployeeIds.length > 0) {
        // Delete logs and payroll records associated with test employees
        await prisma.payrollAdjustment.deleteMany({
          where: { payroll: { employeeId: { in: testEmployeeIds } } }
        });
        await prisma.payrollHistory.deleteMany({
          where: { payroll: { employeeId: { in: testEmployeeIds } } }
        });
        await prisma.payroll.deleteMany({
          where: { employeeId: { in: testEmployeeIds } }
        });
        await prisma.dailyWorkLog.deleteMany({
          where: { employeeId: { in: testEmployeeIds } }
        });
        await prisma.unifiedAttendance.deleteMany({
          where: { personId: { in: testEmployeeIds }, personType: 'EMPLOYEE' }
        });
        
        // Delete employees
        await prisma.employee.deleteMany({
          where: { id: { in: testEmployeeIds } }
        });
      }

      // Delete users associated with test employees
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'emp-', endsWith: `@example.com` } }
      });

      // Delete test admin user
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId }
        });
      }

      // Restore original payroll settings
      if (originalSettingsBackup) {
        await prisma.payrollSettings.update({
          where: { id: '1' },
          data: {
            standardWorkingDays: originalSettingsBackup.standardWorkingDays,
            standardWorkingHours: originalSettingsBackup.standardWorkingHours,
          }
        });
      } else {
        await prisma.payrollSettings.deleteMany({
          where: { id: '1' }
        });
      }
      console.log(`  Database cleanup completed successfully.`);
    } catch (cleanupErr: any) {
      console.error(`  ${colors.red}⚠️ Error during database cleanup:${colors.reset}`, cleanupErr);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RESULTS REPORT SUMMARY
    // ═════════════════════════════════════════════════════════════════════════
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}📋 PAYROLL AUDIT TEST RUN SUMMARY${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`  🧪  ${colors.bold}Total Test Assertions Run:${colors.reset} ${totalTests}`);
    console.log(`      ✅ Passed: ${colors.green}${passedTests}${colors.reset}`);
    console.log(`      ❌ Failed: ${failedTests > 0 ? colors.red : colors.green}${failedTests}${colors.reset}`);

    if (testFailures.length > 0) {
      console.log(`\n${colors.bold}${colors.red}❌ FAILED ASSERTIONS:${colors.reset}`);
      for (const fail of testFailures) {
        console.log(`   • ${fail}`);
      }
      console.log('');
      await prisma.$disconnect();
      process.exit(1);
    } else {
      console.log(`\n${colors.bgGreen}${colors.white}${colors.bold} 🎉 ALL PAYROLL ENGINE AUDIT CHECKS PASSED SUCCESSFULLY! ${colors.reset}\n`);
      await prisma.$disconnect();
      process.exit(0);
    }
  }
})();
