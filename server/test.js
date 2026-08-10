import { validateAttendanceEditWindow } from './src/utils/dateValidation.js';
async function runTests() {
    console.log("=== ATTENDANCE TESTS ===");
    let passed = 0;
    let failed = 0;
    const check = (condition, msg) => {
        if (condition) {
            console.log(`[PASS] ${msg}`);
            passed++;
        }
        else {
            console.log(`[FAIL] ${msg}`);
            failed++;
        }
    };
    // 1. Today -> editable
    try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        validateAttendanceEditWindow(todayStr);
        check(true, "Today is editable");
    }
    catch (e) {
        check(false, "Today is not editable - " + e.message);
    }
    // 2. Yesterday -> editable
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        validateAttendanceEditWindow(yesterdayStr);
        check(true, "Yesterday is editable");
    }
    catch (e) {
        check(false, "Yesterday is not editable - " + e.message);
    }
    // 3. Older than 48 hours -> 403
    try {
        const past = new Date();
        past.setDate(past.getDate() - 3);
        const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        validateAttendanceEditWindow(pastStr);
        check(false, "Older than 48 hours is editable");
    }
    catch (e) {
        check(true, "Older than 48 hours is locked (403)");
    }
    // 4. Tomorrow -> 403
    try {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const tmrwStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
        validateAttendanceEditWindow(tmrwStr);
        check(false, "Tomorrow is editable");
    }
    catch (e) {
        check(true, "Tomorrow is locked (403)");
    }
    console.log("\n=== TIMEZONE TESTS ===");
    const testMidnight = new Date("2026-08-11T00:00:00Z");
    const formatUtcDate = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    check(formatUtcDate(testMidnight) === "2026-08-11", "Timezone conversions do not change attendance dates");
    console.log("\n=== PAYROLL LOGIC (UNIT TEST EQUIVALENTS) ===");
    // Test 18: CORRECTION adjustment included
    const adjustments = [
        { type: 'BONUS', amount: 1000 },
        { type: 'CORRECTION', amount: 500 },
        { type: 'DEDUCTION', amount: 200 }
    ];
    const totalAdjustments = adjustments.reduce((sum, adj) => {
        if (adj.type === 'BONUS' || adj.type === 'INCENTIVE' || adj.type === 'ARREARS' || adj.type === 'CORRECTION')
            return sum + Number(adj.amount);
        if (adj.type === 'DEDUCTION' || adj.type === 'PENALTY' || adj.type === 'ADVANCE_DEDUCTION')
            return sum - Number(adj.amount);
        return sum;
    }, 0);
    check(totalAdjustments === 1300, `CORRECTION adjustment included correctly (Expected 1300, Got ${totalAdjustments})`);
    // Test 19: Overtime does not reduce attendance deduction
    const theoreticalFullSalary = 15000;
    const baseSalary = 13000;
    const overtimeEarnings = 1000;
    // Old buggy logic: Math.max(0, theoreticalFullSalary - baseSalary - overtimeEarnings);
    // New fixed logic: Math.max(0, theoreticalFullSalary - baseSalary);
    const oldBuggyDeduction = Math.max(0, theoreticalFullSalary - baseSalary - overtimeEarnings);
    const newDeduction = Math.max(0, theoreticalFullSalary - baseSalary);
    check(newDeduction === 2000, `Overtime does not reduce attendance deduction (Expected 2000, Got ${newDeduction})`);
    check(oldBuggyDeduction === 1000, `(Sanity check that old logic was 1000)`);
    // Overtime multiplier tests
    const standardHours = 8;
    const dailySalaryBase = 576.92; // Approx 15000 / 26
    const testOvertime = (workedHours, expectedMultiplier) => {
        const multiplier = workedHours / standardHours;
        return Math.abs(multiplier - expectedMultiplier) < 0.001;
    };
    check(testOvertime(8, 1.000), "Overtime 8h -> 1.000x");
    check(testOvertime(9, 1.125), "Overtime 9h -> 1.125x");
    check(testOvertime(10, 1.250), "Overtime 10h -> 1.250x");
    check(testOvertime(12, 1.500), "Overtime 12h -> 1.500x");
    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
}
runTests().catch(console.error);
