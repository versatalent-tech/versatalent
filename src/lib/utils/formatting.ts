/**
 * Formatting Utilities
 * Shared functions for formatting dates, currency, numbers, etc.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format currency with symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = 'GBP',
  locale: string = 'en-GB'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100); // Assuming amount is in pence/cents
}

/**
 * Format currency for Stripe (amount in smallest unit)
 */
export function formatCurrencyForStripe(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Parse currency string to number (in smallest unit)
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Format date to readable string
 */
export function formatDate(
  date: Date | string,
  formatString: string = 'PPP' // e.g., "Jan 1, 2024"
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string,
  formatString: string = 'PPP p' // e.g., "Jan 1, 2024 at 5:30 PM"
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format time only (e.g., "5:30 PM")
 */
export function formatTime(
  date: Date | string,
  formatString: string = 'p'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number, locale: string = 'en-GB'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 0
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format phone number (UK format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // UK mobile: 07XXX XXXXXX
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }

  if (cleaned.length === 10) {
    // UK landline without leading 0
    return `0${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
  }

  return phone; // Return as-is if format not recognized
}

/**
 * Format VIP tier name
 */
export function formatVipTier(tier: string): string {
  const tierMap: Record<string, string> = {
    silver: 'Silver',
    gold: 'Gold',
    black: 'Black Card',
  };
  return tierMap[tier.toLowerCase()] || capitalize(tier);
}

/**
 * Format industry name
 */
export function formatIndustry(industry: string): string {
  const industryMap: Record<string, string> = {
    music: 'Music',
    acting: 'Acting',
    modeling: 'Modeling',
    culinary: 'Culinary Arts',
    sports: 'Sports',
  };
  return industryMap[industry.toLowerCase()] || capitalize(industry);
}

/**
 * Format order status
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return statusMap[status.toLowerCase()] || capitalize(status);
}

/**
 * Format event status
 */
export function formatEventStatus(status: string): string {
  const statusMap: Record<string, string> = {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status.toLowerCase()] || capitalize(status);
}

/**
 * Generate initials from name (for avatars)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Format points with comma separator
 */
export function formatPoints(points: number): string {
  return formatNumber(points) + ' pts';
}

/**
 * Format duration (minutes to readable format)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase())
    .trim();
}
