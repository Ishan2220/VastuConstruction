import { prisma } from '../config/database.js';

export const getSettings = async () => {
  let settings = await prisma.systemSettings.findUnique({ where: { id: "1" } });
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: "1",
        settings: {
          defaultGstMode: 'NONE',
          defaultGstPercentage: 18,
          availableGstRates: [0, 5, 12, 18, 28],
          allowCustomGstPercentage: true,
          allowManualGstAmount: true,
          gstMandatory: false,
          allowOperatorOverride: true
        },
        featureFlags: {},
      }
    });
  }
  return settings;
};

export const updateSettings = async (data: any) => {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "1" },
    update: {
      settings: data.settings !== undefined ? data.settings : undefined,
      featureFlags: data.featureFlags !== undefined ? data.featureFlags : undefined,
      closedPeriodUntil: data.closedPeriodUntil ? new Date(data.closedPeriodUntil) : undefined,
      companyDetails: data.companyDetails !== undefined ? data.companyDetails : undefined,
      letterheadUrl: data.letterheadUrl !== undefined ? data.letterheadUrl : undefined,
    },
    create: {
      id: "1",
      settings: data.settings || {},
      featureFlags: data.featureFlags || {},
      closedPeriodUntil: data.closedPeriodUntil ? new Date(data.closedPeriodUntil) : null,
      companyDetails: data.companyDetails || {},
      letterheadUrl: data.letterheadUrl || null,
    }
  });
  return settings;
};
