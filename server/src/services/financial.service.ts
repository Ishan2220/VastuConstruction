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

  static async calculateClientReceivable(): Promise<number> {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { contractValue: true, incomes: { where: { deletedAt: null }, select: { amount: true, gstAmount: true } } }
    });
    let receivable = 0;
    for (const p of projects) {
      const contractValue = Number(p.contractValue) || 0;
      const income = p.incomes.reduce((sum, i) => sum + Number(i.amount) + Number(i.gstAmount || 0), 0);
      receivable += Math.max(0, contractValue - income);
    }
    return receivable;
  }

  static async calculateVendorPayable(): Promise<number> {
    const [ordersAgg, paymentsAgg] = await Promise.all([
      prisma.materialOrder.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.vendorPayment.aggregate({ _sum: { amount: true } })
    ]);
    const orders = Number(ordersAgg._sum.totalAmount) || 0;
    const payments = Number(paymentsAgg._sum.amount) || 0;
    return Math.max(0, orders - payments);
  }

  /**
   * Total Income (Using explicit Date Filters)
   */
  static async calculateMonthlyIncome(startDate?: Date, endDate?: Date): Promise<number> {
    const agg = await prisma.income.aggregate({
      _sum: { amount: true, gstAmount: true },
      where: {
        deletedAt: null,
        ...(startDate && endDate && { paymentDate: { gte: startDate, lte: endDate } })
      }
    });
    return (Number(agg._sum.amount) || 0) + (Number(agg._sum.gstAmount) || 0);
  }

  static async calculateMonthlyExpenses(startDate?: Date, endDate?: Date): Promise<number> {
    const dateFilter = startDate && endDate ? { paymentDate: { gte: startDate, lte: endDate } } : {};
    
    const [expenseAgg] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true, gstAmount: true },
        where: { deletedAt: null, ...dateFilter }
      })
    ]);

    const total = (Number(expenseAgg._sum.amount) || 0) + (Number(expenseAgg._sum.gstAmount) || 0);

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
