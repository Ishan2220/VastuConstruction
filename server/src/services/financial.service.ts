import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

export class FinancialService {
  /**
   * Cash in Hand = Sum of BankAccount balances where type is 'CASH'
   */
  static async calculateCashInHand(): Promise<number> {
    const agg = await prisma.bankAccount.aggregate({
      _sum: { balance: true },
      where: { accountType: 'CASH', isActive: true },
    });
    return Number(agg._sum?.balance) || 0;
  }

  /**
   * Bank Balance = Sum of BankAccount balances where type is not 'CASH'
   */
  static async calculateBankBalance(): Promise<number> {
    const agg = await prisma.bankAccount.aggregate({
      _sum: { balance: true },
      where: { accountType: { not: 'CASH' }, isActive: true },
    });
    return Number(agg._sum?.balance) || 0;
  }

  /**
   * Total Bank & Cash Balance = Sum of all BankAccounts (Opening + Ledger derived)
   * The cached balance already incorporates this.
   */
  static async calculateTotalBalance(): Promise<number> {
    const agg = await prisma.bankAccount.aggregate({
      _sum: { balance: true }
    });
    return Number(agg._sum?.balance) || 0;
  }

  /**
   * Client Receivable = Contract Value of Active Projects - Incomes on Active Projects
   */
  static async calculateClientReceivable(): Promise<number> {
    const data = await prisma.$queryRaw<{ receivable: Prisma.Decimal }[]>`
      SELECT COALESCE(
        (SELECT SUM(contract_value) FROM projects WHERE deleted_at IS NULL AND contract_value IS NOT NULL AND status != 'CANCELLED') -
        (SELECT COALESCE(SUM(amount), 0) FROM incomes WHERE project_id IN (SELECT id FROM projects WHERE deleted_at IS NULL AND status != 'CANCELLED')), 0
      ) as receivable
    `;
    return Number(data[0]?.receivable) || 0;
  }

  /**
   * Vendor Payable = Total Material Orders - Total Vendor Payments
   */
  static async calculateVendorPayable(): Promise<number> {
    const agg = await prisma.journalLine.aggregate({
      _sum: { creditAmount: true, debitAmount: true },
      where: { description: 'Accounts Payable' },
    });
    const credit = Number(agg._sum.creditAmount) || 0;
    const debit = Number(agg._sum.debitAmount) || 0;
    return Math.round((credit - debit) * 100) / 100;
  }

  /**
   * Total Income (Using explicit Date Filters)
   */
  static async calculateMonthlyIncome(startDate?: Date, endDate?: Date): Promise<number> {
    const agg = await prisma.income.aggregate({
      _sum: { amount: true },
      where: {
        ...(startDate && endDate && { paymentDate: { gte: startDate, lte: endDate } })
      }
    });
    return Number(agg._sum.amount) || 0;
  }

  static async calculateMonthlyExpenses(startDate?: Date, endDate?: Date): Promise<number> {
    const dateFilter = startDate && endDate ? { paymentDate: { gte: startDate, lte: endDate } } : {};
    
    const [expenseAgg, vendorAgg, labourAgg, salaryAgg] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: dateFilter
      }),
      prisma.vendorPayment.aggregate({
        _sum: { amount: true },
        where: dateFilter
      }),
      prisma.labourPayment.aggregate({
        _sum: { amount: true },
        where: dateFilter
      }),
      prisma.salaryPayment.aggregate({
        _sum: { amount: true },
        where: dateFilter
      })
    ]);

    const total = 
      (Number(expenseAgg._sum.amount) || 0) +
      (Number(vendorAgg._sum.amount) || 0) +
      (Number(labourAgg._sum.amount) || 0) +
      (Number(salaryAgg._sum.amount) || 0);

    return total;
  }

  /**
   * Overall Profit = Total Income - Total Expenses
   */
  static async calculateProfit(startDate?: Date, endDate?: Date): Promise<number> {
    const income = await this.calculateMonthlyIncome(startDate, endDate);
    const expenses = await this.calculateMonthlyExpenses(startDate, endDate);
    // Prevents JS float precision errors by rounding
    return Math.round((income - expenses) * 100) / 100;
  }

  /**
   * Get complete financial summary
   */
  static async getFinancialSummary() {
    // Current month explicitly
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      cashInHand,
      bankBalance,
      totalBalance,
      clientReceivable,
      vendorPayable,
      monthlyIncome,
      monthlyExpenses,
      allTimeIncome,
      allTimeExpenses
    ] = await Promise.all([
      this.calculateCashInHand(),
      this.calculateBankBalance(),
      this.calculateTotalBalance(),
      this.calculateClientReceivable(),
      this.calculateVendorPayable(),
      this.calculateMonthlyIncome(startOfMonth, endOfMonth),
      this.calculateMonthlyExpenses(startOfMonth, endOfMonth),
      this.calculateMonthlyIncome(),
      this.calculateMonthlyExpenses()
    ]);

    const profit = Math.round((allTimeIncome - allTimeExpenses) * 100) / 100;

    return {
      cashInHand,
      bankBalance,
      totalBalance,
      clientReceivable,
      vendorPayable,
      monthlyIncome,
      monthlyExpenses,
      profit
    };
  }
}
