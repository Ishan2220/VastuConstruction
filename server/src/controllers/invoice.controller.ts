import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as invoiceService from '../services/invoice.service.js';

export const getInvoices = async (req: Request, res: Response) => {
  const result = await invoiceService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Invoices retrieved successfully'));
};

export const getInvoiceById = async (req: Request, res: Response) => {
  const invoice = await invoiceService.getById(req.params.id as string);
  res.json(new ApiResponse(200, invoice, 'Invoice retrieved successfully'));
};

export const createInvoice = async (req: Request, res: Response) => {
  const newInvoice = await invoiceService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, newInvoice, 'Invoice created successfully'));
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  const { status, paymentMethod, accountId } = req.body;
  const invoice = await invoiceService.updateStatus(req.params.id as string, status, paymentMethod, accountId, req.user!.userId);
  res.json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
};

export const deleteInvoice = async (req: Request, res: Response) => {
  await invoiceService.remove(req.params.id as string);
  res.json(new ApiResponse(200, null, 'Invoice deleted successfully'));
};
