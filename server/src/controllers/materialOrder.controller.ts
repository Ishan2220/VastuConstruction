import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { validateBackdating } from '../utils/dateValidation.js';
import * as orderService from '../services/materialOrder.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Material orders fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getById(req.params.id as string);
  res.json(new ApiResponse(200, order, 'Material order fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const orderDate = req.body.orderDate || new Date();
  validateBackdating(orderDate, req.user!.role);
  
  const data = { ...req.body, orderDate: new Date(orderDate) };
  const order = await orderService.create(data, req.user!.userId);
  res.status(201).json(new ApiResponse(201, order, 'Material order created successfully'));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateStatus(req.params.id as string, req.body.status, req.user!.userId);
  res.json(new ApiResponse(200, order, 'Order status updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, order, 'Material order deleted successfully'));
});

export const receive = asyncHandler(async (req: Request, res: Response) => {
  const { itemsReceived } = req.body;
  if (!itemsReceived || !Array.isArray(itemsReceived)) {
    return res.status(400).json(new ApiResponse(400, null, 'itemsReceived array is required'));
  }
  const order = await orderService.receiveOrder(req.params.id as string, itemsReceived, req.user!.userId);
  res.json(new ApiResponse(200, order, 'Material order stock received successfully'));
});

