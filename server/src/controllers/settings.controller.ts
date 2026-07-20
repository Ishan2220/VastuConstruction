import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  gstPercentage: 18,
  invoicePrefix: 'INV-',
  financialYear: '2026-2027',
  workingHours: 8,
  companyName: 'Vastu Construction',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
};

export const getSettings = async (req: Request, res: Response) => {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "1" }
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: "1",
        settings: DEFAULT_SETTINGS
      }
    });
  }

  res.json(new ApiResponse(200, settings.settings, 'Settings retrieved successfully'));
};

export const updateSettings = async (req: Request, res: Response) => {
  const { settings } = req.body;

  const updatedSettings = await prisma.systemSettings.upsert({
    where: { id: "1" },
    update: {
      settings: settings
    },
    create: {
      id: "1",
      settings: settings
    }
  });

  res.json(new ApiResponse(200, updatedSettings.settings, 'Settings updated successfully'));
};
