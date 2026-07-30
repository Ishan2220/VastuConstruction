import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as leadService from '../services/lead.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await leadService.list(req.query as any);
  res.json(new ApiResponse(200, result, 'Leads fetched successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.getById(req.params.id as string);
  res.json(new ApiResponse(200, lead, 'Lead fetched successfully'));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.create(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, lead, 'Lead created successfully'));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.update(req.params.id as string, req.body, req.user!.userId);
  res.json(new ApiResponse(200, lead, 'Lead updated successfully'));
});

export const convertToClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await leadService.convertToClient(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, client, 'Lead converted to Client successfully'));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.updateStatus(req.params.id as string, req.body.status, req.user!.userId, req.body.notes);
  res.json(new ApiResponse(200, lead, 'Lead status updated successfully'));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await leadService.remove(req.params.id as string, req.user!.userId);
  res.json(new ApiResponse(200, null, 'Lead deleted successfully'));
});

export const exportLeads = asyncHandler(async (req: Request, res: Response) => {
  // Override limit to fetch all matching leads for export
  const query = { ...req.query, limit: 10000, page: 1 } as any;
  const result = await leadService.list(query);
  
  const leads = result.data;
  
  if (leads.length === 0) {
    res.status(404).json(new ApiResponse(404, null, 'No leads found to export'));
    return;
  }
  
  const headers = ['ID', 'Name', 'Phone', 'Email', 'Status', 'Source', 'Capture Date', 'Plot Address', 'Plot Area', 'Budget', 'Created At'];
  const rows = leads.map(l => [
    l.id,
    `"${l.name || ''}"`,
    `"${l.phone || ''}"`,
    `"${l.email || ''}"`,
    `"${l.status || ''}"`,
    `"${l.source || ''}"`,
    `"${l.captureDate ? new Date(l.captureDate).toISOString().split('T')[0] : ''}"`,
    `"${l.plotAddress || ''}"`,
    `"${l.plotArea || ''}"`,
    l.budget || 0,
    `"${new Date(l.createdAt).toISOString().split('T')[0]}"`
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.status(200).send(csvContent);
});
