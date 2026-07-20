import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const globalSearch = async (req: Request, res: Response) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.json(new ApiResponse(200, [], 'Please enter at least 2 characters'));
  }

  const searchTerm = query.trim();
  const searchPattern = `%${searchTerm}%`;

  const results: any[] = [];

  // Search Clients
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { companyName: { contains: searchTerm, mode: 'insensitive' } }
      ],
      isArchived: false
    },
    take: 5
  });
  clients.forEach(c => results.push({ type: 'Client', id: c.id, title: c.name, subtitle: c.phone, icon: 'UserCircle' }));

  // Search Projects
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { projectCode: { contains: searchTerm, mode: 'insensitive' } }
      ],
      isArchived: false
    },
    take: 5
  });
  projects.forEach(p => results.push({ type: 'Project', id: p.id, title: p.name, subtitle: p.projectCode || 'No Code', icon: 'Building2' }));

  // Search Vendors
  const vendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } }
      ],
      isArchived: false
    },
    take: 5
  });
  vendors.forEach(v => results.push({ type: 'Vendor', id: v.id, title: v.name, subtitle: v.phone, icon: 'Truck' }));

  // Search Employees
  const employees = await prisma.employee.findMany({
    where: {
      user: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      isArchived: false
    },
    include: { user: true },
    take: 5
  });
  employees.forEach(e => results.push({ type: 'Employee', id: e.id, title: e.user.name, subtitle: e.designation || 'Staff', icon: 'Briefcase' }));

  // Search Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { contains: searchTerm, mode: 'insensitive' },
      isArchived: false
    },
    take: 5
  });
  invoices.forEach(i => results.push({ type: 'Invoice', id: i.id, title: i.invoiceNumber, subtitle: i.status, icon: 'FileText' }));

  // Search Purchase Orders
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      poNumber: { contains: searchTerm, mode: 'insensitive' },
      isArchived: false
    },
    take: 5
  });
  pos.forEach(p => results.push({ type: 'Purchase Order', id: p.id, title: p.poNumber, subtitle: p.status, icon: 'ShoppingCart' }));

  res.json(new ApiResponse(200, results, 'Search completed successfully'));
};
