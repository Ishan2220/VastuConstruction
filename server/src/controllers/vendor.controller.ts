import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as vendorService from '../services/vendor.service.js';
import * as vendorPaymentService from '../services/vendorPayment.service.js';
import { validateBackdating } from '../utils/dateValidation.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await vendorService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Vendors fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorService.getById(req.params.id as string);
  res.json(new ApiResponse(200, vendor, 'Vendor fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, vendor, 'Vendor created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, vendor, 'Vendor updated successfully'));
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentDate = req.body.paymentDate || new Date();
  validateBackdating(paymentDate, req.user!.role);

  if (req.body.details && Array.isArray(req.body.details)) {
    const payment = await vendorPaymentService.createPaymentWithDetails(req.params.id as string, req.body, req.user!.userId);
    res.status(201).json(new ApiResponse(201, payment, 'Detailed vendor payment recorded successfully'));
  } else {
    const payment = await vendorService.recordPayment(req.params.id as string, req.body, req.user!.userId);
    res.status(201).json(new ApiResponse(201, payment, 'Vendor payment recorded successfully'));
  }
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await vendorService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Vendor deleted successfully'));
});

export const getByProject = asyncHandler(async (req: Request, res: Response) => {
  const vendors = await vendorService.getVendorsByProject(req.params.projectId as string);
  res.json(new ApiResponse(200, vendors, 'Project vendors fetched successfully'));
});
