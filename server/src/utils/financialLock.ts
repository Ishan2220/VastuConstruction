import { ApiError } from './ApiError.js';
import { getSettings } from '../services/settings.service.js';

export const checkFinancialLock = async (date: Date) => {
  const settings = await getSettings();
  if (settings.closedPeriodUntil && date <= settings.closedPeriodUntil) {
    throw new ApiError(403, `Financial period is locked for dates on or before ${settings.closedPeriodUntil.toISOString().split('T')[0]}`);
  }
};
