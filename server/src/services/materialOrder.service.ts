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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const generateOrderNumber = async (): Promise<string> => {
  const count = await prisma.materialOrder.count();
  return `MO-${String(count + 1).padStart(5, '0')}`;
};

export const list = async (params: ListParams) => {
  const { page = 1, limit = 10, search, projectId, vendorId, status, sortBy = 'createdAt', sortOrder = 'desc' } = params;
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
  };

  const [data, total] = await Promise.all([
    prisma.materialOrder.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy]: sortOrder },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        items: {
          include: { material: { select: { name: true, unit: true } } },
        },
      },
    }),
    prisma.materialOrder.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
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
      project: { select: { id: true, name: true } },
      items: {
        include: { material: { select: { id: true, name: true, unit: true } } },
      },
    },
  });

  if (!order) throw new ApiError(404, 'Material order not found');
  return order;
};

interface CreateOrderData {
  vendorId: string;
  projectId: string;
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

  const finalOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.materialOrder.create({
      data: {
        orderNumber,
        vendorId: data.vendorId,
        projectId: data.projectId,
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
    const expense = await tx.expense.create({
      data: {
        vendorId: data.vendorId,
        projectId: data.projectId,
        type: 'MATERIAL',
        amount: totalAmount,
        paymentDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
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
      entryDate: new Date(),
      description: `Material Order: ${orderNumber}`,
      referenceId: created.id,
      referenceType: 'MATERIAL_ORDER',
      createdById: userId,
      lines
    }, tx);

    return created;
  });

  const iKey = data.idempotencyKey || crypto.randomUUID();
  eventBus.publishMutation('MaterialOrder', 'CREATE', userId, finalOrder.id, iKey, finalOrder, null);
  return finalOrder;
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

