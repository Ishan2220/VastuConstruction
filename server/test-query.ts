import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const baseQuery = Prisma.sql`
    WITH AllPayments AS (
      SELECT 
        i.id,
        CAST('INFLOW' AS TEXT) as direction,
        i.type as "paymentType",
        i.payment_date as "paymentDate",
        i.amount,
        i.payment_method as "paymentMethod",
        i.reference,
        i.notes as remarks,
        CAST('COMPLETED' AS TEXT) as status,
        i.created_at as "createdAt",
        CAST('Client Payment' AS TEXT) as "source",
        i.client_id as "clientId",
        c.name as "clientName",
        i.project_id as "projectId",
        p.name as "projectName",
        CAST(NULL AS TEXT) as "vendorId",
        CAST(NULL AS TEXT) as "vendorName",
        CAST(NULL AS TEXT) as "employeeId",
        CAST(NULL AS TEXT) as "employeeName",
        CAST(NULL AS TEXT) as "labourId",
        CAST(NULL AS TEXT) as "labourName",
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
        'VENDOR_PAYMENT' as "paymentType",
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
        vp.project_id as "projectId",
        p.name as "projectName",
        vp.vendor_id as "vendorId",
        v.name as "vendorName",
        NULL as "employeeId",
        NULL as "employeeName",
        NULL as "labourId",
        NULL as "labourName",
        vp.account_id as "accountId",
        a.account_name as "accountName",
        a.account_no as "accountNo",
        vp.created_by_id as "createdById",
        u.name as "createdByName"
      FROM vendor_payments vp
      LEFT JOIN projects p ON vp.project_id = p.id
      LEFT JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN bank_accounts a ON vp.account_id = a.id
      LEFT JOIN users u ON vp.created_by_id = u.id

      UNION ALL

      SELECT 
        lp.id,
        'OUTFLOW' as direction,
        'LABOUR_WAGE' as "paymentType",
        lp.payment_date as "paymentDate",
        lp.amount,
        lp.payment_method as "paymentMethod",
        lp.reference,
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
        lp.account_id as "accountId",
        a.account_name as "accountName",
        a.account_no as "accountNo",
        lp.created_by_id as "createdById",
        u.name as "createdByName"
      FROM labour_payments lp
      LEFT JOIN labours l ON lp.labour_id = l.id
      LEFT JOIN bank_accounts a ON lp.account_id = a.id
      LEFT JOIN users u ON lp.created_by_id = u.id

      UNION ALL

      SELECT 
        sp.id,
        'OUTFLOW' as direction,
        'SALARY' as "paymentType",
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

  const query = Prisma.sql`
    ${baseQuery}
    SELECT *
    FROM AllPayments
    ORDER BY "paymentDate" DESC
    LIMIT 10
  `;

  try {
    const data = await prisma.$queryRaw(query);
    console.log("SUCCESS:");
    console.log(data);
  } catch (error) {
    console.error("ERROR:");
    console.error(error);
  }
}

main();
