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
  await invoiceService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Invoice deleted successfully'));
};

import fs from 'fs';
import path from 'path';
import { generateInvoicePDF } from '../utils/invoiceGenerator.js';

export const downloadInvoicePDF = async (req: Request, res: Response) => {
  const invoice = await invoiceService.getById(req.params.id as string);
  
  const entityData = invoice.type === 'CLIENT' ? invoice.client : invoice.vendor;
  
  const tempPath = path.resolve(process.cwd(), `temp/invoice-${invoice.id}.pdf`);
  
  await generateInvoicePDF(invoice, entityData, tempPath);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  
  const fileStream = fs.createReadStream(tempPath);
  fileStream.pipe(res);
  
  fileStream.on('end', () => {
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });
  
  fileStream.on('error', (err) => {
    console.error('Error streaming PDF:', err);
    if (!res.headersSent) {
      res.status(500).json(new ApiResponse(500, null, 'Error generating PDF'));
    }
  });
};
