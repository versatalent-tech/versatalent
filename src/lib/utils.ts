import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a secure random password for new users
 * Password will be 12 characters long with mix of upper, lower, numbers, and symbols
 */
export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Exclude i, l, o
  const numbers = '23456789'; // Exclude 0, 1
  const symbols = '!@#$%&*+-=?';

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate an email-friendly username from a name
 * Example: "John Doe" -> "john.doe"
 */
export function generateUsernameFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '.'); // Replace spaces with dots
}

/**
 * Generate a default email for a talent/user
 * Example: "John Doe" -> "john.doe@versatalent.com"
 */
export function generateDefaultEmail(name: string, domain: string = 'versatalent.com'): string {
  return `${generateUsernameFromName(name)}@${domain}`;
}
