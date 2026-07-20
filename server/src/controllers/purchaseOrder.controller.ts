import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const getPurchaseOrders = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, vendorId, projectId, status } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const whereClause: any = { isArchived: false };

  if (vendorId) whereClause.vendorId = vendorId;
  if (projectId) whereClause.projectId = projectId;
  if (status) whereClause.status = status;

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: whereClause,
      skip,
      take: limitNumber,
      orderBy: { issueDate: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        items: true
      }
    }),
    prisma.purchaseOrder.count({ where: whereClause })
  ]);

  res.json(new ApiResponse(200, {
    purchaseOrders: pos,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber)
    }
  }, 'Purchase orders retrieved successfully'));
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id as string },
    include: {
      vendor: true,
      project: true,
      items: {
        include: {
          material: true
        }
      }
    }
  });

  if (!po) {
    return res.status(404).json(new ApiResponse(404, null, 'Purchase order not found'));
  }

  res.json(new ApiResponse(200, po, 'Purchase order retrieved successfully'));
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  const { poNumber, vendorId, projectId, issueDate, expectedDate, status, items, notes } = req.body;

  let totalAmount = 0;
  let taxAmount = 0;

  const newPo = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendorId,
      projectId,
      issueDate: new Date(issueDate || Date.now()),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: status || 'DRAFT',
      totalAmount: 0,
      taxAmount: 0,
      notes,
      items: {
        create: items.map((item: any) => {
          const amount = Number(item.quantityOrdered) * Number(item.rate);
          totalAmount += amount;
          return {
            materialId: item.materialId,
            quantityOrdered: item.quantityOrdered,
            rate: item.rate,
            amount
          };
        })
      }
    }
  });

  const updatedPo = await prisma.purchaseOrder.update({
    where: { id: newPo.id },
    data: { totalAmount, taxAmount },
    include: {
      vendor: { select: { name: true } }
    }
  });

  await prisma.businessActivity.create({
    data: {
      action: 'CREATED',
      module: 'MATERIAL',
      description: `Purchase Order ${poNumber} created for vendor ${updatedPo.vendor.name}`,
      vendorId,
      projectId,
      amount: totalAmount,
      referenceNo: poNumber
    }
  });

  res.status(201).json(new ApiResponse(201, updatedPo, 'Purchase order created successfully'));
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;

  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id as string },
    data: { status }
  });

  res.json(new ApiResponse(200, po, 'Purchase order status updated successfully'));
};

export const archivePurchaseOrder = async (req: Request, res: Response) => {
  await prisma.purchaseOrder.update({
    where: { id: req.params.id as string },
    data: { isArchived: true }
  });

  res.json(new ApiResponse(200, null, 'Purchase order archived successfully'));
};
