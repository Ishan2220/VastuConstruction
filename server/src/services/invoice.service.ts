import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import type { Prisma } from '@prisma/client';
import * as incomeService from './income.service.js';
import * as expenseService from './expense.service.js';
import { checkFinancialLock } from '../utils/financialLock.js';
import { eventBus } from '../events/EventBus.js';
import { randomUUID } from 'crypto';

interface InvoiceListParams {
  page?: number;
  limit?: number;
  clientId?: string;
  vendorId?: string;
  projectId?: string;
  status?: string;
  type?: string;
}

export const list = async (params: InvoiceListParams) => {
  const { page = 1, limit = 20, clientId, vendorId, projectId, status, type } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.InvoiceWhereInput = { isArchived: false };
  if (clientId) where.clientId = clientId;
  if (vendorId) where.vendorId = vendorId;
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (type) where.type = type;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectCode: true } },
        items: true
      }
    }),
    prisma.invoice.count({ where })
  ]);

  return {
    invoices,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

export const getById = async (id: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      vendor: true,
      project: true,
      items: true
    }
  });

  if (!invoice) throw new ApiError(404, 'Invoice not found');
  return invoice;
};

export const create = async (
  data: {
    invoiceNumber: string;
    type?: string;
    issueDate: Date;
    dueDate?: Date;
    clientId?: string;
    vendorId?: string;
    projectId?: string;
    status?: string;
    gstMode?: 'NONE' | 'PERCENTAGE' | 'AMOUNT';
    gstPercentage?: number | null;
    gstAmount?: number | null;
    items?: any[];
  },
  userId: string
) => {
  await checkFinancialLock(data.issueDate);
  const numSubtotal = data.items ? data.items.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
  
  let numTax = 0;
  if (data.gstMode === 'PERCENTAGE') {
    numTax = (numSubtotal * Number(data.gstPercentage)) / 100;
  } else if (data.gstMode === 'AMOUNT') {
    numTax = Number(data.gstAmount);
  }
  
  const numTotal = numSubtotal + numTax;

  const newInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      type: data.type || 'CLIENT',
      issueDate: new Date(data.issueDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      clientId: data.clientId || null,
      vendorId: data.vendorId || null,
      projectId: data.projectId || null,
      subtotal: numSubtotal,
      gstMode: data.gstMode || 'NONE',
      gstPercentage: data.gstPercentage !== undefined && data.gstPercentage !== null ? Number(data.gstPercentage) : null,
      taxAmount: numTax,
      totalAmount: numTotal,
      status: data.status || 'UNPAID',
      items: {
        create: data.items?.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          amount: Number(item.amount),
          gstRate: item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : null,
          gstAmount: item.gstAmount !== undefined && item.gstAmount !== null ? Number(item.gstAmount) : null
        })) || []
      }
    },
    include: {
      client: { select: { name: true } },
      vendor: { select: { name: true } }
    }
  });

  const entityName = newInvoice.client?.name || newInvoice.vendor?.name || 'Unknown';

  await prisma.businessActivity.create({
    data: {
      action: 'GENERATED',
      module: 'INVOICE',
      description: `Invoice ${data.invoiceNumber} generated for ${entityName}`,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      amount: numTotal,
      referenceNo: data.invoiceNumber
    }
  });

  eventBus.publishMutation('Invoice', 'CREATE', userId, newInvoice.id, randomUUID(), newInvoice);

  return newInvoice;
};

export const updateStatus = async (invoiceId: string, status: string, paymentMethod?: string, accountId?: string, userId?: string) => {
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, vendor: true }
  });

  if (!existingInvoice) throw new ApiError(404, 'Invoice not found');

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status }
  });

  if (status === 'PAID' && existingInvoice.status !== 'PAID' && userId) {
    await checkFinancialLock(new Date()); // Payment happens now
    if (existingInvoice.type === 'CLIENT' && existingInvoice.clientId) {
      await incomeService.create({
        clientId: existingInvoice.clientId as string,
        projectId: existingInvoice.projectId,
        amount: Number(existingInvoice.subtotal),
        gstMode: (existingInvoice as any).gstMode || 'NONE',
        gstPercentage: (existingInvoice as any).gstPercentage !== undefined && (existingInvoice as any).gstPercentage !== null ? Number((existingInvoice as any).gstPercentage) : null,
        gstAmount: Number(existingInvoice.taxAmount || 0),
        totalAmount: Number(existingInvoice.totalAmount),
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'BANK',
        accountId: accountId || null,
        type: 'Invoice Payment',
        invoiceNo: existingInvoice.invoiceNumber,
        reference: `Payment for Invoice ${existingInvoice.invoiceNumber}`,
        notes: `Auto-generated from Invoice status change`
      }, userId);
    } else if (existingInvoice.type === 'VENDOR' && existingInvoice.vendorId) {
      await expenseService.create({
        projectId: existingInvoice.projectId,
        vendorId: existingInvoice.vendorId as string,
        amount: Number(existingInvoice.subtotal),
        gstMode: (existingInvoice as any).gstMode || 'NONE',
        gstPercentage: (existingInvoice as any).gstPercentage !== undefined && (existingInvoice as any).gstPercentage !== null ? Number((existingInvoice as any).gstPercentage) : null,
        gstAmount: Number(existingInvoice.taxAmount || 0),
        totalAmount: Number(existingInvoice.totalAmount),
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'BANK',
        accountId: accountId || null,
        type: 'Vendor Payment',
        description: `Payment for Vendor Invoice ${existingInvoice.invoiceNumber}`,
      }, userId);
    }
  } else if (status !== 'PAID' && existingInvoice.status === 'PAID' && userId) {
    if (existingInvoice.type === 'CLIENT' && existingInvoice.clientId) {
      const income = await prisma.income.findFirst({ where: { invoiceNo: existingInvoice.invoiceNumber } });
      if (income) await incomeService.remove(income.id, userId);
    } else if (existingInvoice.type === 'VENDOR' && existingInvoice.vendorId) {
      // Find expense by description or exact reference. Let's just find by type and projectId? 
      // It's safer to add an 'invoiceNo' to Expense, but since it doesn't exist, we can use Prisma deleteMany with description match
      await prisma.expense.deleteMany({
        where: {
          vendorId: existingInvoice.vendorId,
          type: 'Vendor Payment',
          description: `Payment for Vendor Invoice ${existingInvoice.invoiceNumber}`
        }
      });
    }
  }

  if (userId) {
    eventBus.publishMutation('Invoice', 'UPDATE', userId, invoice.id, randomUUID(), { status }, { status: existingInvoice.status });
  }

  return invoice;
};

export const remove = async (id: string, userId?: string) => {
  const oldInvoice = await getById(id);
  await checkFinancialLock(oldInvoice.issueDate);
  
  if (oldInvoice.status === 'PAID') {
    if (oldInvoice.type === 'CLIENT' && oldInvoice.clientId) {
      const income = await prisma.income.findFirst({ where: { invoiceNo: oldInvoice.invoiceNumber } });
      if (income) await incomeService.remove(income.id, userId);
    } else if (oldInvoice.type === 'VENDOR' && oldInvoice.vendorId) {
      await prisma.expense.deleteMany({
        where: {
          vendorId: oldInvoice.vendorId,
          type: 'Vendor Payment',
          description: `Payment for Vendor Invoice ${oldInvoice.invoiceNumber}`
        }
      });
    }
  }

  await prisma.invoice.delete({ where: { id } });
  if (userId) {
    eventBus.publishMutation('Invoice', 'DELETE', userId, id, randomUUID(), null, oldInvoice);
  }
  return { success: true };
};
