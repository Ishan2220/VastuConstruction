import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry } from './journal.service.js';
import { normalizePaymentMethod } from '../utils/normalizers.js';
import type { Prisma } from '@prisma/client';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, category, city, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.VendorWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
  };

  const [rawData, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { materials: true } },
        purchaseOrders: { select: { totalAmount: true } },
        expenses: { select: { amount: true } },
        vendorAttendances: { select: { totalWage: true } }
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  const data = rawData.map(vendor => {
    const totalPurchased = vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0)
      + vendor.vendorAttendances.reduce((sum, va) => sum + Number(va.totalWage || 0), 0);
    const totalPaid = vendor.expenses
      .filter(ex => (ex as any).paymentMethod !== 'ACCRUED')
      .reduce((sum, ex) => sum + Number(ex.amount || 0), 0);
    const openingBal = Number(vendor.openingBalance || 0);
    const outstanding = openingBal + totalPurchased - totalPaid;

    const { purchaseOrders, expenses, vendorAttendances, ...rest } = vendor;

    return {
      ...rest,
      totalPurchased,
      totalPaid,
      outstanding
    };
  });

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getById = async (id: string) => {
  const vendor = await prisma.vendor.findFirst({
    where: { id, deletedAt: null },
    include: {
      materials: { select: { id: true, name: true, unit: true, rate: true } },
      materialOrders: {
        orderBy: { orderDate: 'desc' },
        take: 10,
        select: {
          id: true, orderNumber: true, totalAmount: true,
          status: true, orderDate: true,
          project: { select: { name: true } },
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
      documents: { orderBy: { createdAt: 'desc' } },
      purchaseOrders: {
        select: { id: true, totalAmount: true, projectId: true, project: { select: { id: true, name: true } } },
      },
      expenses: {
        select: { id: true, amount: true, projectId: true, paymentDate: true, remarks: true, description: true, project: { select: { id: true, name: true } } },
      },
      vendorAttendances: {
        select: { id: true, date: true, totalWage: true, projectId: true, project: { select: { id: true, name: true } } },
      }
    },
  });

  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return vendor;
};

export const create = async (payload: any, userId: string) => {
  const { gstin, idempotencyKey, ...rest } = payload;
  const data: Prisma.VendorCreateInput = {
    ...rest,
    ...(gstin !== undefined && rest.gst === undefined ? { gst: gstin } : {}),
  };
  const vendor = await prisma.vendor.create({ data });
  eventBus.publishMutation('Vendor', 'CREATE', userId, vendor.id, payload.idempotencyKey || crypto.randomUUID(), vendor, null);
  return vendor;
};

export const update = async (id: string, payload: any, userId: string) => {
  const existing = await prisma.vendor.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Vendor not found');

  const { gstin, idempotencyKey, ...rest } = payload;
  const data: Prisma.VendorUncheckedUpdateInput = {
    ...rest,
    ...(gstin !== undefined && rest.gst === undefined ? { gst: gstin } : {}),
  };

  const vendor = await prisma.vendor.update({ where: { id }, data });
  eventBus.publishMutation('Vendor', 'UPDATE', userId, id, payload.idempotencyKey || crypto.randomUUID(), vendor, existing);
  return vendor;
};

export const remove = async (id: string, userId: string) => {
  const existing = await prisma.vendor.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, 'Vendor not found');

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  eventBus.publishMutation('Vendor', 'DELETE', userId, id, crypto.randomUUID(), null, existing);
  return vendor;
};

export const addPayment = async (vendorId: string, data: any, userId: string) => {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const result = await prisma.$transaction(async (tx) => {
    const paymentAmount = Number(data.amount) || 0;
    const payment = await tx.vendorPayment.create({
      data: {
        vendorId,
        amount: paymentAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: normalizePaymentMethod(data.paymentMethod),
        reference: data.reference,
        notes: data.notes,
      },
    });

    const expense = await tx.expense.create({
      data: {
        vendorId,
        projectId: data.projectId || null,
        type: vendor.category === 'LABOUR_CONTRACTOR' ? 'LABOUR' : 'VENDOR',
        amount: paymentAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        accountId: data.accountId || null,
        description: data.purpose ? `Payment for ${data.purpose} to ${vendor.name} (Ref: ${data.reference || 'N/A'})` : `Payment to ${vendor.name} (Ref: ${data.reference || 'N/A'})`,
        remarks: data.notes,
        createdById: userId,
      }
    });

    await postJournalEntry({
      entryDate: payment.paymentDate,
      description: `Vendor Payment to ${vendor.name} - ${data.notes || ''}`,
      referenceId: payment.id,
      referenceType: 'VENDOR_PAYMENT',
      createdById: userId,
      lines: [
        { accountId: null, debitAmount: paymentAmount, creditAmount: 0, description: 'Accounts Payable' },
        { accountId: data.accountId, debitAmount: 0, creditAmount: paymentAmount, description: 'Bank/Cash Outflow' }
      ]
    }, tx);

    return { payment, expense };
  });
  
  eventBus.publishMutation('VendorPayment', 'CREATE', userId, result.payment.id, data.idempotencyKey || crypto.randomUUID(), result.payment, null);
  eventBus.publishMutation('Expense', 'CREATE', userId, result.expense.id, crypto.randomUUID(), result.expense, null);
  return result.payment;
};

export const recordPayment = addPayment;

export const getVendorsByProject = async (projectId: string) => {
  const vendors = await prisma.vendor.findMany({
    where: {
      deletedAt: null,
      OR: [
        { expenses: { some: { projectId } } },
        { purchaseOrders: { some: { projectId } } },
        { materials: { some: { stock: { some: { projectId } } } } }
      ]
    },
    include: {
      purchaseOrders: { where: { projectId }, select: { totalAmount: true } },
      expenses: { where: { projectId }, select: { amount: true } }
    }
  });

  return vendors.map(vendor => {
    const totalPurchased = vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    const totalPaid = vendor.expenses.reduce((sum, ex) => sum + Number(ex.amount || 0), 0);
    
    // For project-specific view, outstanding is just (Purchased - Paid) on that project
    const outstanding = totalPurchased - totalPaid;
    
    const { purchaseOrders, expenses, ...rest } = vendor;
    
    return {
      ...rest,
      totalPurchased,
      totalPaid,
      outstanding
    };
  });
};
