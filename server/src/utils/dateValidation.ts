import { ApiError } from './ApiError.js';

export function validateBackdating(dateString: string | Date | undefined, role: string) {
  if (!dateString) return;
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate < today && role !== 'ADMIN') {
    throw new ApiError(403, 'Only admins can add or edit records for past dates.');
  }
}
