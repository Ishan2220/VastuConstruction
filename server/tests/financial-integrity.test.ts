import { prisma } from '../src/config/database.js';

// ANSI escape codes for terminal formatting
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

(async () => {
  console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   📊 FINANCIAL INTEGRITY & ACCOUNTING INVARIANT VALIDATION TEST   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  let hasErrors = false;

  try {
    // 1. Fetch all Journal Entries with their Journal Lines
    console.log(`${colors.blue}🔍 Fetching Journal Entries from database...${colors.reset}`);
    const journalEntries = await prisma.journalEntry.findMany({
      include: {
        lines: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`${colors.dim}Found ${journalEntries.length} total journal entries to audit.${colors.reset}\n`);

    let journalsPassed = 0;
    let journalsFailed = 0;
    const imbalancedEntries: Array<{
      id: string;
      description: string;
      entryDate: Date;
      linesCount: number;
      totalDebit: number;
      totalCredit: number;
      diff: number;
    }> = [];

    const zeroLineEntries: Array<{
      id: string;
      description: string;
      entryDate: Date;
    }> = [];

    // 2. Audit each Journal Entry
    for (const entry of journalEntries) {
      const lineCount = entry.lines.length;

      // Invariant Check 1: No JournalEntry should have zero lines
      if (lineCount === 0) {
        zeroLineEntries.push({
          id: entry.id,
          description: entry.description,
          entryDate: entry.entryDate,
        });
        journalsFailed++;
        hasErrors = true;
        continue;
      }

      // Invariant Check 2: Double-entry invariant (debit === credit)
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of entry.lines) {
        totalDebit += Number(line.debitAmount);
        totalCredit += Number(line.creditAmount);
      }

      // Round to 2 decimal places to handle standard currency floating point precision
      const roundDebit = Math.round(totalDebit * 100) / 100;
      const roundCredit = Math.round(totalCredit * 100) / 100;
      const diff = Math.abs(roundDebit - roundCredit);

      if (diff > 0.001) {
        imbalancedEntries.push({
          id: entry.id,
          description: entry.description,
          entryDate: entry.entryDate,
          linesCount: lineCount,
          totalDebit: roundDebit,
          totalCredit: roundCredit,
          diff: Math.round(diff * 100) / 100,
        });
        journalsFailed++;
        hasErrors = true;
      } else {
        journalsPassed++;
      }
    }

    // 3. Fetch and audit Bank Accounts
    console.log(`${colors.blue}🏦 Fetching Bank Accounts from database...${colors.reset}`);
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: {
        accountName: 'asc',
      },
    });

    console.log(`${colors.dim}Found ${bankAccounts.length} total bank accounts to audit.${colors.reset}\n`);

    let bankAccountsPassed = 0;
    let bankAccountsFailed = 0;
    const negativeAccounts: Array<{
      id: string;
      accountName: string;
      accountNo: string;
      bankName: string;
      balance: number;
    }> = [];

    // Invariant Check 3: All BankAccount balances must be non-negative
    for (const account of bankAccounts) {
      const balanceNum = Number(account.balance);
      if (balanceNum < 0) {
        negativeAccounts.push({
          id: account.id,
          accountName: account.accountName,
          accountNo: account.accountNo,
          bankName: account.bankName,
          balance: balanceNum,
        });
        bankAccountsFailed++;
        hasErrors = true;
      } else {
        bankAccountsPassed++;
      }
    }

    // 4. Output detailed findings for failed checks
    if (zeroLineEntries.length > 0) {
      console.log(`${colors.bold}${colors.red}❌ ZERO-LINE JOURNAL ENTRIES DETECTED (${zeroLineEntries.length}):${colors.reset}`);
      for (const entry of zeroLineEntries) {
        console.log(
          `   • ${colors.yellow}ID:${colors.reset} ${entry.id} | ${colors.yellow}Date:${colors.reset} ${entry.entryDate.toISOString().split('T')[0]} | ${colors.yellow}Desc:${colors.reset} "${entry.description}"`
        );
      }
      console.log('');
    }

    if (imbalancedEntries.length > 0) {
      console.log(`${colors.bold}${colors.red}❌ IMBALANCED JOURNAL ENTRIES DETECTED (${imbalancedEntries.length}):${colors.reset}`);
      for (const entry of imbalancedEntries) {
        console.log(
          `   • ${colors.yellow}ID:${colors.reset} ${entry.id} | ${colors.yellow}Date:${colors.reset} ${entry.entryDate.toISOString().split('T')[0]}`
        );
        console.log(
          `     ${colors.dim}Desc:${colors.reset} "${entry.description}" | ${colors.dim}Lines:${colors.reset} ${entry.linesCount}`
        );
        console.log(
          `     ${colors.red}Debit: ${entry.totalDebit.toFixed(2)} | Credit: ${entry.totalCredit.toFixed(2)} | Discrepancy: ${entry.diff.toFixed(2)}${colors.reset}`
        );
      }
      console.log('');
    }

    if (negativeAccounts.length > 0) {
      console.log(`${colors.bold}${colors.red}❌ NEGATIVE BANK ACCOUNT BALANCES DETECTED (${negativeAccounts.length}):${colors.reset}`);
      for (const acc of negativeAccounts) {
        console.log(
          `   • ${colors.yellow}ID:${colors.reset} ${acc.id} | ${colors.yellow}Bank:${colors.reset} ${acc.bankName} | ${colors.yellow}Account:${colors.reset} ${acc.accountName} (${acc.accountNo})`
        );
        console.log(`     ${colors.red}Balance: ${acc.balance.toFixed(2)}${colors.reset}`);
      }
      console.log('');
    }

    // 5. Summary Report
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}📋 FINANCIAL INTEGRITY AUDIT SUMMARY REPORT${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`  🧾  ${colors.bold}Total Journal Entries Checked:${colors.reset} ${journalEntries.length}`);
    console.log(`      ✅ Passed (Balanced & Valid):     ${colors.green}${journalsPassed}${colors.reset}`);
    console.log(`      ❌ Failed (Imbalanced / 0 lines): ${journalsFailed > 0 ? colors.red : colors.green}${journalsFailed}${colors.reset}`);

    if (zeroLineEntries.length > 0) {
      console.log(`         - Zero-line entries:           ${colors.red}${zeroLineEntries.length}${colors.reset}`);
    }
    if (imbalancedEntries.length > 0) {
      console.log(`         - Imbalanced entries:          ${colors.red}${imbalancedEntries.length}${colors.reset}`);
    }

    console.log(`\n  🏦  ${colors.bold}Total Bank Accounts Checked:${colors.reset}  ${bankAccounts.length}`);
    console.log(`      ✅ Passed (Non-negative Balance):  ${colors.green}${bankAccountsPassed}${colors.reset}`);
    console.log(`      ❌ Failed (Negative Balance):      ${bankAccountsFailed > 0 ? colors.red : colors.green}${bankAccountsFailed}${colors.reset}`);

    console.log(`${colors.bold}${colors.cyan}─────────────────────────────────────────────────────────────────────────${colors.reset}`);

    if (hasErrors) {
      console.log(`${colors.bgRed}${colors.white}${colors.bold} ❌ AUDIT FAILED: Financial integrity invariants were violated! ${colors.reset}\n`);
      await prisma.$disconnect();
      process.exit(1);
    } else {
      console.log(`${colors.bgGreen}${colors.white}${colors.bold} ✅ AUDIT PASSED: All financial integrity checks succeeded! ${colors.reset}\n`);
      await prisma.$disconnect();
      process.exit(0);
    }
  } catch (err) {
    console.error(`\n${colors.bold}${colors.red}❌ Unexpected Error during Financial Integrity Audit:${colors.reset}`, err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
