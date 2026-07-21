import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const getInvoices = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, clientId, projectId, status } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const whereClause: any = { isArchived: false };

  if (clientId) whereClause.clientId = clientId;
  if (projectId) whereClause.projectId = projectId;
  if (status) whereClause.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      skip,
      take: limitNumber,
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        project: { select: { id: true, name: true, projectCode: true } }
      }
    }),
    prisma.invoice.count({ where: whereClause })
  ]);

  res.json(new ApiResponse(200, {
    invoices,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber)
    }
  }, 'Invoices retrieved successfully'));
};

export const getInvoiceById = async (req: Request, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id as string },
    include: {
      client: true,
      project: true
    }
  });

  if (!invoice) {
    return res.status(404).json(new ApiResponse(404, null, 'Invoice not found'));
  }

  res.json(new ApiResponse(200, invoice, 'Invoice retrieved successfully'));
};

export const createInvoice = async (req: Request, res: Response) => {
  const { invoiceNumber, issueDate, dueDate, clientId, projectId, subtotal, taxAmount, totalAmount, status } = req.body;

  const numSubtotal = Number(subtotal) || 0;
  const numTax = Number(taxAmount) || 0;
  const numTotal = Number(totalAmount) || numSubtotal;

  const newInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      clientId,
      projectId,
      subtotal: numSubtotal,
      taxAmount: numTax,
      totalAmount: numTotal,
      status: status || 'UNPAID'
    },
    include: {
      client: { select: { name: true } },
      project: { select: { name: true } }
    }
  });

  // Record activity
  await prisma.businessActivity.create({
    data: {
      action: 'GENERATED',
      module: 'INVOICE',
      description: `Invoice ${invoiceNumber} generated for ${newInvoice.client.name}`,
      clientId,
      projectId,
      amount: numTotal,
      referenceNo: invoiceNumber
    }
  });

  res.status(201).json(new ApiResponse(201, newInvoice, 'Invoice created successfully'));
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  const { status } = req.body;

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id as string },
    data: { status }
  });

  res.json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
};

export const deleteInvoice = async (req: Request, res: Response) => {
  await prisma.invoice.delete({
    where: { id: req.params.id as string }
  });

  res.json(new ApiResponse(200, null, 'Invoice deleted successfully'));
};
