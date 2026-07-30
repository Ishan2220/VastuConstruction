import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import crypto from 'crypto';

export const getSettings = async () => {
  let settings = await prisma.payrollSettings.findUnique({
    where: { id: "1" }
  });
  
  if (!settings) {
    settings = await prisma.payrollSettings.create({
      data: { id: "1", standardWorkingDays: 26, standardWorkingHours: 8 }
    });
  }
  
  return settings;
};

export const updateSettings = async (data: any, userId: string) => {
  const { standardWorkingDays, standardWorkingHours } = data;
  
  const settings = await prisma.payrollSettings.upsert({
    where: { id: "1" },
    update: {
      standardWorkingDays: standardWorkingDays ? Number(standardWorkingDays) : undefined,
      standardWorkingHours: standardWorkingHours ? Number(standardWorkingHours) : undefined,
    },
    create: {
      id: "1",
      standardWorkingDays: standardWorkingDays ? Number(standardWorkingDays) : 26,
      standardWorkingHours: standardWorkingHours ? Number(standardWorkingHours) : 8,
    }
  });

  eventBus.publishMutation('PayrollSettings', 'UPDATE', userId, settings.id, crypto.randomUUID(), settings, null);
  
  return settings;
};
