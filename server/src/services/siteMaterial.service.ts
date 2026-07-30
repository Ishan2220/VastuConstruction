import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import crypto from 'crypto';

export const getSiteMaterialsSummary = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new ApiError(404, 'Project not found');

  const stocks = await prisma.stock.findMany({
    where: { projectId },
    include: { material: { include: { vendor: { select: { name: true } } } } },
  });

  const consumptions = await prisma.materialConsumption.groupBy({
    by: ['materialId'],
    where: { projectId, action: 'CONSUMED' },
    _sum: { quantity: true },
  });

  const totalConsumedMap = new Map(consumptions.map(c => [c.materialId, c._sum.quantity || 0]));

  const materials = stocks.map(stock => {
    const consumed = totalConsumedMap.get(stock.materialId) || 0;
    const remaining = Number(stock.quantity) - Number(consumed);
    const received = Number(stock.quantity);
    const cost = received * Number(stock.material.rate || 0);

    return {
      id: stock.material.id,
      name: stock.material.name,
      unit: stock.material.unit,
      vendorName: stock.material.vendor?.name || 'Unknown',
      received,
      consumed: Number(consumed),
      remaining,
      cost,
      stockId: stock.id
    };
  });

  const totalCost = materials.reduce((acc, curr) => acc + curr.cost, 0);

  return { materials, totalCost };
};

export const receiveMaterial = async (projectId: string, data: any, userId: string) => {
  const { materialId, quantity, rate, amount, reference, notes, paymentMethod, accountId } = data;

  const project = await prisma.project.findUnique({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new ApiError(404, 'Project not found');

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new ApiError(404, 'Material not found');

  // 1. Create or update Stock
  let stock = await prisma.stock.findFirst({
    where: { projectId, materialId }
  });

  if (stock) {
    stock = await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: { increment: quantity } }
    });
  } else {
    stock = await prisma.stock.create({
      data: {
        projectId,
        materialId,
        quantity,
      }
    });
  }

  // 2. Log Material Consumption (Action: PURCHASED / RECEIVED)
  const consumption = await prisma.materialConsumption.create({
    data: {
      projectId,
      materialId,
      action: 'RECEIVED',
      quantity,
      reference,
      notes,
      createdById: userId
    }
  });

  // 3. Create Expense for the purchase
  const expense = await prisma.expense.create({
    data: {
      projectId,
      vendorId: material.vendorId,
      type: 'MATERIAL',
      amount,
      totalAmount: amount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'CASH',
      accountId: accountId || null,
      description: `Material Received: ${material.name} x ${quantity} ${material.unit}`,
      remarks: notes,
      createdById: userId,
    }
  });

  // 4. Create Journal Entry
  const journal = await prisma.journalEntry.create({
    data: {
      entryDate: new Date(),
      description: `Material Receipt - ${material.name}`,
      referenceId: expense.id,
      referenceType: 'EXPENSE',
      createdById: userId,
      lines: {
        create: [
          {
            description: `Site Expense: ${project.name}`,
            debitAmount: amount,
            creditAmount: 0
          },
          {
            accountId,
            description: paymentMethod,
            debitAmount: 0,
            creditAmount: amount
          }
        ]
      }
    }
  });

  eventBus.publishMutation('Stock', 'UPDATE', userId, stock.id, crypto.randomUUID(), stock, null);
  eventBus.publishMutation('MaterialConsumption', 'CREATE', userId, consumption.id, crypto.randomUUID(), consumption, null);
  eventBus.publishMutation('Expense', 'CREATE', userId, expense.id, crypto.randomUUID(), expense, null);

  return { stock, consumption, expense };
};

export const consumeMaterial = async (projectId: string, data: any, userId: string) => {
  const { materialId, quantity, notes } = data;

  const stock = await prisma.stock.findFirst({
    where: { projectId, materialId }
  });

  const consumptions = await prisma.materialConsumption.aggregate({
    where: { projectId, materialId, action: 'CONSUMED' },
    _sum: { quantity: true }
  });

  const totalConsumed = Number(consumptions._sum.quantity || 0);
  const remainingStock = stock ? Number(stock.quantity) - totalConsumed : 0;

  if (!stock || remainingStock < quantity) {
    throw new ApiError(400, `Insufficient stock to consume. Only ${remainingStock} left.`);
  }

  // Log consumption
  const consumption = await prisma.materialConsumption.create({
    data: {
      projectId,
      materialId,
      action: 'CONSUMED',
      quantity,
      notes,
      createdById: userId
    }
  });

  eventBus.publishMutation('MaterialConsumption', 'CREATE', userId, consumption.id, crypto.randomUUID(), consumption, null);

  return consumption;
};

export const getMaterialHistory = async (projectId: string, materialId: string) => {
  const history = await prisma.materialConsumption.findMany({
    where: { projectId, materialId },
    orderBy: { date: 'desc' },
    include: { createdBy: { select: { name: true } } }
  });
  return history;
};

export const updateConsumption = async (id: string, data: any, userId: string) => {
  const { quantity, notes } = data;
  
  const existing = await prisma.materialConsumption.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Consumption record not found');
  
  // Calculate new stock requirement
  if (quantity) {
    const diff = Number(quantity) - Number(existing.quantity);
    if (diff > 0) {
      const stock = await prisma.stock.findFirst({ where: { projectId: existing.projectId, materialId: existing.materialId } });
      const consumptions = await prisma.materialConsumption.aggregate({
        where: { projectId: existing.projectId, materialId: existing.materialId, action: 'CONSUMED' },
        _sum: { quantity: true }
      });
      const totalConsumed = Number(consumptions._sum.quantity || 0);
      const remainingStock = stock ? Number(stock.quantity) - totalConsumed : 0;
      
      if (!stock || remainingStock < diff) {
        throw new ApiError(400, `Insufficient stock to increase consumption. Only ${remainingStock} left.`);
      }
    }
  }

  const consumption = await prisma.materialConsumption.update({
    where: { id },
    data: { quantity, notes }
  });

  eventBus.publishMutation('MaterialConsumption', 'UPDATE', userId, id, crypto.randomUUID(), consumption, existing);
  return consumption;
};

export const deleteConsumption = async (id: string, userId: string) => {
  const existing = await prisma.materialConsumption.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Consumption record not found');

  await prisma.materialConsumption.delete({ where: { id } });
  eventBus.publishMutation('MaterialConsumption', 'DELETE', userId, id, crypto.randomUUID(), null, existing);
  return { success: true };
};
