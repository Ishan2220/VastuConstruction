import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const checkConsistency = async (_req: Request, res: Response) => {
  try {
    const issues: string[] = [];

    // Check 1: Journal Entries Balance
    const unbalancedEntries = await prisma.$queryRaw<any[]>`
      SELECT "journal_entry_id", SUM(debit) as total_debit, SUM(credit) as total_credit
      FROM "journal_lines"
      GROUP BY "journal_entry_id"
      HAVING SUM(debit) != SUM(credit)
    `;

    if (unbalancedEntries.length > 0) {
      issues.push(`Found ${unbalancedEntries.length} unbalanced journal entries.`);
    }

    // Check 2: Invoice Totals
    const invalidInvoices = await prisma.$queryRaw<any[]>`
      SELECT id, "total_amount", "paid_amount", "due_amount"
      FROM "invoices"
      WHERE ABS(CAST("total_amount" AS DECIMAL) - (CAST("paid_amount" AS DECIMAL) + CAST("due_amount" AS DECIMAL))) > 0.01
    `;

    if (invalidInvoices.length > 0) {
      issues.push(`Found ${invalidInvoices.length} invoices with incorrect totals.`);
    }

    res.status(200).json({
      success: true,
      data: {
        isConsistent: issues.length === 0,
        issuesCount: issues.length,
        issues
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to run consistency checks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
