import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Filters
  const search = req.query.search ? String(req.query.search).toLowerCase() : '';
  const direction = req.query.direction as string;
  const type = req.query.type as string;
  const method = req.query.method as string;
  
  // Date filters
  const dateFilter = req.query.dateFilter as string; // 'today', 'yesterday', 'this_week', 'this_month', 'financial_year', 'custom'
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  const now = new Date();
  if (dateFilter === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateFilter === 'yesterday') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (dateFilter === 'this_week') {
    const day = now.getDay() || 7;
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateFilter === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (dateFilter === 'financial_year') {
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    startDate = new Date(startYear, 3, 1);
    endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  } else if (dateFilter === 'custom' && req.query.startDate && req.query.endDate) {
    startDate = new Date(req.query.startDate as string);
    endDate = new Date(req.query.endDate as string);
    endDate.setHours(23, 59, 59, 999);
  }

  // Base UNION query for all payments
  // We use string concatenation for the base query but Prisma.sql for variables to prevent SQL injection
  const baseQuery = Prisma.sql`
    WITH AllPayments AS (
      SELECT 
        i.id,
        'INFLOW' as direction,
        i.type as "paymentType",
        i.payment_date as "paymentDate",
        i.amount,
        i.payment_method as "paymentMethod",
        i.reference,
        i.notes as remarks,
        'COMPLETED' as status,
        i.created_at as "createdAt",
        'Client Payment' as "source",
        i.client_id as "clientId",
        c.name as "clientName",
        i.project_id as "projectId",
        p.name as "projectName",
        NULL as "vendorId",
        NULL as "vendorName",
        NULL as "employeeId",
        NULL as "employeeName",
        NULL as "labourId",
        NULL as "labourName",
        i.account_id as "accountId",
        a.account_name as "accountName",
        a.account_no as "accountNo",
        i.created_by_id as "createdById",
        u.name as "createdByName"
      FROM incomes i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN bank_accounts a ON i.account_id = a.id
      LEFT JOIN users u ON i.created_by_id = u.id

      UNION ALL

      SELECT 
        e.id,
        'OUTFLOW' as direction,
        e.type as "paymentType",
        e.payment_date as "paymentDate",
        e.amount,
        e.payment_method as "paymentMethod",
        NULL as reference,
        e.remarks as remarks,
        'COMPLETED' as status,
        e.created_at as "createdAt",
        'Expense' as "source",
        NULL as "clientId",
        NULL as "clientName",
        e.project_id as "projectId",
        p.name as "projectName",
        e.vendor_id as "vendorId",
        v.name as "vendorName",
        NULL as "employeeId",
        NULL as "employeeName",
        NULL as "labourId",
        NULL as "labourName",
        e.account_id as "accountId",
        a.account_name as "accountName",
        a.account_no as "accountNo",
        e.created_by_id as "createdById",
        u.name as "createdByName"
      FROM expenses e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN bank_accounts a ON e.account_id = a.id
      LEFT JOIN users u ON e.created_by_id = u.id

      UNION ALL

      SELECT 
        vp.id,
        'OUTFLOW' as direction,
        'Vendor Payment' as "paymentType",
        vp.payment_date as "paymentDate",
        vp.amount,
        vp.payment_method as "paymentMethod",
        vp.reference,
        vp.notes as remarks,
        'COMPLETED' as status,
        vp.created_at as "createdAt",
        'Vendor Payment' as "source",
        NULL as "clientId",
        NULL as "clientName",
        NULL as "projectId",
        NULL as "projectName",
        vp.vendor_id as "vendorId",
        v.name as "vendorName",
        NULL as "employeeId",
        NULL as "employeeName",
        NULL as "labourId",
        NULL as "labourName",
        NULL as "accountId",
        NULL as "accountName",
        NULL as "accountNo",
        NULL as "createdById",
        NULL as "createdByName"
      FROM vendor_payments vp
      LEFT JOIN vendors v ON vp.vendor_id = v.id

      UNION ALL

      SELECT 
        lp.id,
        'OUTFLOW' as direction,
        'Labour Payment' as "paymentType",
        lp.payment_date as "paymentDate",
        lp.amount,
        lp.payment_method as "paymentMethod",
        NULL as reference,
        lp.notes as remarks,
        'COMPLETED' as status,
        lp.created_at as "createdAt",
        'Labour Payment' as "source",
        NULL as "clientId",
        NULL as "clientName",
        NULL as "projectId",
        NULL as "projectName",
        NULL as "vendorId",
        NULL as "vendorName",
        NULL as "employeeId",
        NULL as "employeeName",
        lp.labour_id as "labourId",
        l.name as "labourName",
        NULL as "accountId",
        NULL as "accountName",
        NULL as "accountNo",
        NULL as "createdById",
        NULL as "createdByName"
      FROM labour_payments lp
      LEFT JOIN labours l ON lp.labour_id = l.id

      UNION ALL

      SELECT 
        sp.id,
        'OUTFLOW' as direction,
        'Salary Payment' as "paymentType",
        sp.payment_date as "paymentDate",
        sp.amount,
        sp.payment_method as "paymentMethod",
        sp.reference,
        sp.notes as remarks,
        sp.status as status,
        sp.created_at as "createdAt",
        'Salary Payment' as "source",
        NULL as "clientId",
        NULL as "clientName",
        NULL as "projectId",
        NULL as "projectName",
        NULL as "vendorId",
        NULL as "vendorName",
        sp.employee_id as "employeeId",
        u.name as "employeeName",
        NULL as "labourId",
        NULL as "labourName",
        NULL as "accountId",
        NULL as "accountName",
        NULL as "accountNo",
        NULL as "createdById",
        NULL as "createdByName"
      FROM salary_payments sp
      LEFT JOIN employees emp ON sp.employee_id = emp.id
      LEFT JOIN users u ON emp.user_id = u.id
    )
  `;

  // Dynamic WHERE conditions based on variables
  const conditions: Prisma.Sql[] = [];

  if (direction) {
    conditions.push(Prisma.sql`direction = ${direction}`);
  }
  if (type) {
    conditions.push(Prisma.sql`"paymentType" = ${type}`);
  }
  if (method) {
    conditions.push(Prisma.sql`"paymentMethod" = ${method}`);
  }
  if (startDate) {
    conditions.push(Prisma.sql`"paymentDate" >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(Prisma.sql`"paymentDate" <= ${endDate}`);
  }
  if (search) {
    conditions.push(Prisma.sql`(
      LOWER(id::text) LIKE ${'%' + search + '%'} OR
      LOWER("clientName") LIKE ${'%' + search + '%'} OR
      LOWER("vendorName") LIKE ${'%' + search + '%'} OR
      LOWER("employeeName") LIKE ${'%' + search + '%'} OR
      LOWER("projectName") LIKE ${'%' + search + '%'} OR
      LOWER(reference) LIKE ${'%' + search + '%'} OR
      LOWER(remarks) LIKE ${'%' + search + '%'}
    )`);
  }

  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.sql``;

  const countQuery = Prisma.sql`
    ${baseQuery}
    SELECT CAST(COUNT(*) AS INTEGER) as total
    FROM AllPayments
    ${whereClause}
  `;

  const dataQuery = Prisma.sql`
    ${baseQuery}
    SELECT *
    FROM AllPayments
    ${whereClause}
    ORDER BY "paymentDate" DESC, "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [countResult, data] = await Promise.all([
    prisma.$queryRaw(countQuery) as Promise<[{ total: number }]>,
    prisma.$queryRaw(dataQuery) as Promise<any[]>
  ]);

  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const getPaymentSummary = asyncHandler(async (req: Request, res: Response) => {
  // Similar logic but summarizing today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const baseQuery = Prisma.sql`
    WITH AllPayments AS (
      SELECT 'INFLOW' as direction, amount, 'COMPLETED' as status, payment_date as "paymentDate" FROM incomes
      UNION ALL
      SELECT 'OUTFLOW' as direction, amount, 'COMPLETED' as status, payment_date as "paymentDate" FROM expenses
      UNION ALL
      SELECT 'OUTFLOW' as direction, amount, 'COMPLETED' as status, payment_date as "paymentDate" FROM vendor_payments
      UNION ALL
      SELECT 'OUTFLOW' as direction, amount, 'COMPLETED' as status, payment_date as "paymentDate" FROM labour_payments
      UNION ALL
      SELECT 'OUTFLOW' as direction, amount, status, payment_date as "paymentDate" FROM salary_payments
    )
  `;

  const summaryQuery = Prisma.sql`
    ${baseQuery}
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'INFLOW' AND status = 'COMPLETED' AND "paymentDate" >= ${startOfDay} AND "paymentDate" <= ${endOfDay} THEN amount ELSE 0 END), 0) as "todayInflow",
      COALESCE(SUM(CASE WHEN direction = 'OUTFLOW' AND status = 'COMPLETED' AND "paymentDate" >= ${startOfDay} AND "paymentDate" <= ${endOfDay} THEN amount ELSE 0 END), 0) as "todayOutflow",
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as "pendingPayments",
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) as "completedPayments",
      COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as "cancelledPayments"
    FROM AllPayments
  `;

  const result = await prisma.$queryRaw(summaryQuery) as any[];

  res.json({
    success: true,
    data: result[0] || {
      todayInflow: 0,
      todayOutflow: 0,
      pendingPayments: 0,
      completedPayments: 0,
      cancelledPayments: 0
    }
  });
});
