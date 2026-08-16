import { ApiError } from './ApiError.js';

export function validateBackdating(dateString: string | Date | undefined, role: string) {
  if (!dateString) return;
  const inputDate = new Date(dateString);
  if (isNaN(inputDate.getTime())) throw new ApiError(400, 'Invalid date format');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate < today && (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    throw new ApiError(403, 'Only admins can add or edit records for past dates.');
  }
}

export function validateAttendanceEditWindow(dateStr: string, role: string = '') {
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) throw new ApiError(400, 'Invalid date format');
  
  targetDate.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  
  // Format local today string for safe calendar comparison (YYYY-MM-DD)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (dateStr > todayStr) {
    throw new ApiError(403, 'Cannot mark attendance for future dates');
  }

  const diffHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours > 48 && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot modify attendance beyond a 48-hour window from today');
  }
  
  return targetDate;
}

export function getAttendanceLockStatus(dateStr: string, role: string = '') {
  try {
    const targetDate = validateAttendanceEditWindow(dateStr, role);
    return { isLocked: false, targetDate };
  } catch (error: any) {
    const targetDate = new Date(dateStr);
    if (!isNaN(targetDate.getTime())) {
      targetDate.setUTCHours(0, 0, 0, 0);
    }
    return { isLocked: true, targetDate };
  }
}
