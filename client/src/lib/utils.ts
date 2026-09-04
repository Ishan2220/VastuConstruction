import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format amount in Indian Rupee with lakhs/crores notation
 * e.g., 1875000 -> "18,75,000"
 */
export function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  const str = Math.floor(absNum).toString();

  if (str.length <= 3) {
    return (num < 0 ? '-' : '') + str;
  }

  let lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (num < 0 ? '-' : '') + formatted;
}

/**
 * Format currency in Indian Rupees
 * e.g., 1875000 -> "₹ 18,75,000"
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '₹ 0';
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹ ${formatIndianNumber(Math.abs(amount))}`;
}

/**
 * Format compact currency (for large amounts)
 * e.g., 1875000 -> "₹ 18.75L"
 */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹ ${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹ ${(abs / 100000).toFixed(2)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹ ${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}₹ ${formatIndianNumber(abs)}`;
}

/**
 * Format date as DD MMM YYYY safely avoiding UTC midnight rollback
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  if (typeof date === 'string') {
    const cleanDate = date.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return format(new Date(year, month, day), 'dd MMM yyyy');
      }
    }
  }
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
}

/**
 * Format date and time as DD MMM YYYY, hh:mm a
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

/**
 * Get initials from a name (for avatars)
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/**
 * Get relative time from now
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = typeof date === 'string' ? parseISO(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}
