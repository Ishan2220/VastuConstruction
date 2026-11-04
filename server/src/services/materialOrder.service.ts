import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry } from './journal.service.js';
import type { Prisma } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  vendorId?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const generateOrderNumber = async (): Promise<string> => {
  const count = await prisma.materialOrder.count();
  return `MO-${String(count + 1).padStart(5, '0')}`;
};

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, projectId, vendorId, status, paymentStatus, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.MaterialOrderWhereInput = {
    project: {
      deletedAt: null,
    },
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(projectId && { projectId }),
    ...(vendorId && { vendorId }),
    ...(status && { status }),
    ...(startDate && endDate && {
      orderDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
  };

  const [rawOrders, total] = await Promise.all([
    prisma.materialOrder.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
        items: {
          include: { material: { select: { id: true, name: true, unit: true } } },
        },
      },
    }),
    prisma.materialOrder.count({ where }),
  ]);

  // Aggregate paid expenses for these orders in one query
  const orderNumbers = rawOrders.map(o => o.orderNumber);
  const paidExpenses = orderNumbers.length > 0 ? await prisma.expense.findMany({
    where: {
      deletedAt: null,
      paymentMethod: { not: 'ACCRUED' },
      type: 'MATERIAL',
      OR: [
        ...orderNumbers.map(num => ({ description: { contains: num, mode: 'insensitive' as const } })),
        ...orderNumbers.map(num => ({ remarks: { contains: num, mode: 'insensitive' as const } })),
      ],
    },
    select: {
      id: true,
      amount: true,
      totalAmount: true,
      paymentDate: true,
      paymentMethod: true,
      description: true,
      remarks: true,
      accountId: true,
      account: { select: { bankName: true, accountNo: true } }
    }
  }) : [];

  let data = rawOrders.map(order => {
    const matchingExpenses = paidExpenses.filter(e => 
      (e.description && e.description.toUpperCase().includes(order.orderNumber.toUpperCase())) ||
      (e.remarks && e.remarks.toUpperCase().includes(order.orderNumber.toUpperCase()))
    );

    const paidAmount = matchingExpenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0);
    const totalAmount = Number(order.totalAmount);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    
    let computedPaymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      computedPaymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      computedPaymentStatus = 'PARTIAL';
    }

    return {
      ...order,
      paidAmount,
      pendingAmount,
      advanceAmount: paidAmount > totalAmount ? (paidAmount - totalAmount) : 0,
      paymentStatus: computedPaymentStatus,
      payments: matchingExpenses
    };
  });

  if (paymentStatus && paymentStatus !== 'ALL') {
    data = data.filter(d => d.paymentStatus === paymentStatus);
  }

  // Calculate overall summary metrics
  const totalAmountSum = data.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalPaidSum = data.reduce((sum, o) => sum + Number(o.paidAmount), 0);
  const totalPendingSum = data.reduce((sum, o) => sum + Number(o.pendingAmount), 0);
  const totalAdvanceSum = data.reduce((sum, o) => sum + Number(o.advanceAmount), 0);

  return {
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    summary: {
      totalAmount: totalAmountSum,
      totalPaid: totalPaidSum,
      totalPending: totalPendingSum,
      totalAdvance: totalAdvanceSum,
      count: total
    }
  };
};

export const getById = async (id: string) => {
  const order = await prisma.materialOrder.findFirst({
    where: {
      id,
      project: {
        deletedAt: null,
      },
    },
    include: {
      vendor: { select: { id: true, name: true, phone: true, email: true } },
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true } } },
      },
    },
  });

  if (!order) throw new ApiError(404, 'Material order not found');

  const matchingExpenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      paymentMethod: { not: 'ACCRUED' },
      type: 'MATERIAL',
      OR: [
        { description: { contains: order.orderNumber, mode: 'insensitive' } },
        { remarks: { contains: order.orderNumber, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      amount: true,
      totalAmount: true,
      paymentDate: true,
      paymentMethod: true,
      description: true,
      remarks: true,
      account: { select: { bankName: true, accountNo: true } }
    }
  });

  const paidAmount = matchingExpenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0);
  const totalAmount = Number(order.totalAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'PAID';
  } else if (paidAmount > 0) {
    paymentStatus = 'PARTIAL';
  }

  return {
    ...order,
    paidAmount,
    pendingAmount,
    advanceAmount: paidAmount > totalAmount ? (paidAmount - totalAmount) : 0,
    paymentStatus,
    payments: matchingExpenses
  };
};

interface CreateOrderData {
  vendorId: string;
  projectId: string;
  orderDate?: string | Date;
  deliveryDate?: string;
  notes?: string;
  items: Array<{
    materialId: string;
    quantityOrdered: number;
    rate: number;
  }>;
  gstMode?: 'NONE' | 'PERCENTAGE' | 'AMOUNT';
  gstPercentage?: number | null;
  gstAmount?: number;
  initialPaidAmount?: number;
  paymentMethod?: string;
  accountId?: string;
}

export const create = async (data: CreateOrderData & { idempotencyKey?: string }, userId: string) => {
  const orderNumber = await generateOrderNumber();

  const items = data.items.map((item) => ({
    materialId: item.materialId,
    quantityOrdered: item.quantityOrdered,
    rate: item.rate,
    amount: item.quantityOrdered * item.rate,
  }));

  const amount = items.reduce((sum, item) => sum + item.amount, 0);
  const gstMode = data.gstMode || 'NONE';
  const gstAmount = Number(data.gstAmount) || 0;
  const totalAmount = amount + gstAmount;
  const gstPercentage = data.gstPercentage ? Number(data.gstPercentage) : null;
  const orderDate = data.orderDate ? new Date(data.orderDate) : new Date();

  const finalOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.materialOrder.create({
      data: {
        orderNumber,
        vendorId: data.vendorId,
        projectId: data.projectId,
        orderDate,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        amount,
        gstMode,
        gstPercentage,
        gstAmount,
        totalAmount,
        notes: data.notes,
        items: { create: items },
      },
      include: {
        vendor: { select: { name: true } },
        project: { select: { name: true } },
        items: { include: { material: { select: { name: true, unit: true } } } },
      },
    });

    // Log the incurred material cost as an ACCRUED expense for the project
    await tx.expense.create({
      data: {
        vendorId: data.vendorId,
        projectId: data.projectId,
        type: 'MATERIAL',
        amount: totalAmount,
        paymentDate: data.deliveryDate ? new Date(data.deliveryDate) : orderDate,
        paymentMethod: 'ACCRUED',
        description: `Material Order: ${orderNumber}`,
        remarks: data.notes,
        createdById: userId,
      }
    });

    // Debit Inventory/Material Expense, Debit GST, Credit Accounts Payable
    const lines = [];
    lines.push({ accountId: null, debitAmount: 0, creditAmount: totalAmount, description: 'Accounts Payable' });
    lines.push({ accountId: null, debitAmount: amount, creditAmount: 0, description: 'Inventory/Material (Base)' });
    if (gstAmount > 0) {
      lines.push({ accountId: null, debitAmount: gstAmount, creditAmount: 0, description: 'GST Paid' });
    }

    await postJournalEntry({
      entryDate: orderDate,
      description: `Material Order: ${orderNumber}`,
      referenceId: created.id,
      referenceType: 'MATERIAL_ORDER',
      createdById: userId,
      lines
    }, tx);

    // If an initial payment or advance was provided while creating the entry, log payment immediately!
    const initialPaid = Number(data.initialPaidAmount) || 0;
    if (initialPaid > 0) {
      const payExpense = await tx.expense.create({
        data: {
          vendorId: data.vendorId,
          projectId: data.projectId,
          type: 'MATERIAL',
          amount: initialPaid,
          totalAmount: initialPaid,
          paymentDate: orderDate,
          paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
          accountId: data.accountId || null,
          description: `Payment for Material Entry: ${orderNumber}`,
          remarks: `Initial/Advance payment for order ${orderNumber}`,
          createdById: userId,
        }
      });

      const payLines = [
        { accountId: data.accountId || null, debitAmount: 0, creditAmount: initialPaid, description: `Material Bill Payment: ${orderNumber}` },
        { accountId: null, debitAmount: initialPaid, creditAmount: 0, description: 'Accounts Payable Outflow' }
      ];

      await postJournalEntry({
        entryDate: orderDate,
        description: `Payment for Material Order: ${orderNumber}`,
        referenceId: payExpense.id,
        referenceType: 'EXPENSE',
        createdById: userId,
        lines: payLines
      }, tx);

      if (initialPaid >= totalAmount) {
        await tx.materialOrder.update({
          where: { id: created.id },
          data: { status: 'DELIVERED' }
        });
      } else {
        await tx.materialOrder.update({
          where: { id: created.id },
          data: { status: 'PARTIAL' }
        });
      }
    }

    return created;
  });

  const iKey = data.idempotencyKey || crypto.randomUUID();
  eventBus.publishMutation('MaterialOrder', 'CREATE', userId, finalOrder.id, iKey, finalOrder, null);
  return finalOrder;
};

export const payOrder = async (
  id: string,
  paymentData: {
    amount: number;
    paymentMethod: string;
    accountId?: string | null;
    paymentDate?: string | Date;
    reference?: string;
    remarks?: string;
  },
  userId: string
) => {
  const order = await prisma.materialOrder.findUnique({
    where: { id },
    include: { vendor: true, project: true },
  });
  if (!order) throw new ApiError(404, 'Material order not found');

  const paymentAmount = Number(paymentData.amount);
  if (!paymentAmount || paymentAmount <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than zero');
  }

  const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date();

  const expense = await prisma.$transaction(async (tx) => {
    // 1. Create the payment Expense
    const createdExpense = await tx.expense.create({
      data: {
        vendorId: order.vendorId,
        projectId: order.projectId,
        type: 'MATERIAL',
        amount: paymentAmount,
        totalAmount: paymentAmount,
        paymentDate,
        paymentMethod: paymentData.paymentMethod || 'BANK_TRANSFER',
        accountId: paymentData.accountId || null,
        description: `Payment for Material Entry: ${order.orderNumber}`,
        remarks: paymentData.remarks || `Payment for order ${order.orderNumber} ${paymentData.reference ? `Ref: ${paymentData.reference}` : ''}`.trim(),
        createdById: userId,
      },
    });

    // 2. Post Journal Entry
    const lines = [
      {
        accountId: paymentData.accountId || null,
        debitAmount: 0,
        creditAmount: paymentAmount,
        description: `Material Bill Payment: ${order.orderNumber}`,
      },
      {
        accountId: null,
        debitAmount: paymentAmount,
        creditAmount: 0,
        description: 'Accounts Payable Outflow',
      },
    ];

    await postJournalEntry(
      {
        entryDate: paymentDate,
        description: `Material Payment: ${order.orderNumber}`,
        referenceId: createdExpense.id,
        referenceType: 'EXPENSE',
        createdById: userId,
        lines,
      },
      tx
    );

    // 3. Check total paid for this order
    const allPaidExpenses = await tx.expense.findMany({
      where: {
        deletedAt: null,
        paymentMethod: { not: 'ACCRUED' },
        type: 'MATERIAL',
        OR: [
          { description: { contains: order.orderNumber, mode: 'insensitive' } },
          { remarks: { contains: order.orderNumber, mode: 'insensitive' } },
        ],
      },
      select: { amount: true, totalAmount: true },
    });

    const totalPaid = allPaidExpenses.reduce((s, e) => s + Number(e.totalAmount || e.amount || 0), 0);
    if (totalPaid >= Number(order.totalAmount)) {
      await tx.materialOrder.update({
        where: { id },
        data: { status: 'DELIVERED' },
      });
    } else if (totalPaid > 0) {
      await tx.materialOrder.update({
        where: { id },
        data: { status: 'PARTIAL' },
      });
    }

    return createdExpense;
  });

  eventBus.publishMutation('Expense', 'CREATE', userId, expense.id, crypto.randomUUID(), expense, null);
  eventBus.publishMutation('MaterialOrder', 'UPDATE', userId, id, crypto.randomUUID(), order, null);

  return expense;
};

export const update = async (id: string, data: Prisma.MaterialOrderUncheckedUpdateInput, userId: string) => {
  const existing = await prisma.materialOrder.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Material order not found');

  const order = await prisma.materialOrder.update({ where: { id }, data });
  eventBus.publishMutation('MaterialOrder', 'UPDATE', userId, id, crypto.randomUUID(), order, existing);
  return order;
};

export const remove = async (id: string, userId: string) => {
  const existing = await prisma.materialOrder.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Material order not found');

  await prisma.materialOrderItem.deleteMany({ where: { orderId: id } });
  const order = await prisma.materialOrder.delete({ where: { id } });
  eventBus.publishMutation('MaterialOrder', 'DELETE', userId, id, crypto.randomUUID(), null, existing);
  return order;
};

export const updateStatus = async (id: string, status: any, userId: string) => {
  const existing = await prisma.materialOrder.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Material order not found');

  const order = await prisma.materialOrder.update({
    where: { id },
    data: { status },
  });
  eventBus.publishMutation('MaterialOrder', 'UPDATE', userId, id, crypto.randomUUID(), order, existing);
  return order;
};

export const receiveOrder = async (id: string, itemsReceived: Array<{ materialId: string, quantityReceived: number }>, userId: string) => {
  const existing = await prisma.materialOrder.findUnique({ 
    where: { id },
    include: { items: true }
  });
  if (!existing) throw new ApiError(404, 'Material order not found');

  const order = await prisma.$transaction(async (tx) => {
    let allDelivered = true;
    for (const received of itemsReceived) {
      const item = existing.items.find((i: any) => i.materialId === received.materialId);
      if (item) {
        const newTotalReceived = Number(item.quantityReceived || 0) + Number(received.quantityReceived);
        await tx.materialOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: newTotalReceived }
        });
        if (newTotalReceived < Number(item.quantityOrdered)) {
          allDelivered = false;
        }

        const existingStock = await tx.stock.findUnique({
          where: {
            materialId_projectId: {
              projectId: existing.projectId,
              materialId: received.materialId,
            }
          }
        });
        
        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: Number(received.quantityReceived) } }
          });
        } else {
          await tx.stock.create({
            data: {
              projectId: existing.projectId,
              materialId: received.materialId,
              quantity: Number(received.quantityReceived)
            }
          });
        }
      }
    }

    const updatedStatus = allDelivered ? 'DELIVERED' : 'PARTIAL';
    return await tx.materialOrder.update({
      where: { id },
      data: { status: updatedStatus },
      include: { items: true }
    });
  });

  eventBus.publishMutation('MaterialOrder', 'UPDATE', userId, id, crypto.randomUUID(), order, existing);
  return order;
};

