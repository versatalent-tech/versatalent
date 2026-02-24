/**
 * Validation Utilities
 * Shared validation functions for forms and API inputs
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UK phone number
 */
export function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // UK mobile (07XXX XXXXXX) or landline (0XXX XXX XXXX)
  return /^0[0-9]{10}$/.test(cleaned) || /^(\+44|0044)[0-9]{10}$/.test(cleaned);
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate NFC card UID format
 * Typically 7-10 bytes in hex format
 */
export function isValidNFCCardUID(uid: string): boolean {
  // Hex string, 14-20 characters (7-10 bytes)
  return /^[0-9A-Fa-f]{14,20}$/.test(uid);
}

/**
 * Validate currency amount (positive number with max 2 decimals)
 */
export function isValidCurrencyAmount(amount: number | string): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num < 0) return false;

  // Check max 2 decimal places
  const str = num.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex !== -1) {
    return str.substring(decimalIndex + 1).length <= 2;
  }
  return true;
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: number | string): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(num) && num > 0;
}

/**
 * Validate non-negative integer (includes 0)
 */
export function isNonNegativeInteger(value: number | string): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(num) && num >= 0;
}

/**
 * Validate date string (ISO 8601 format)
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date > new Date();
}

/**
 * Validate date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date < new Date();
}

/**
 * Validate string is not empty (after trimming)
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate array is not empty
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Validate string length
 */
export function hasValidLength(
  str: string,
  min?: number,
  max?: number
): { valid: boolean; error?: string } {
  const length = str.trim().length;

  if (min !== undefined && length < min) {
    return { valid: false, error: `Must be at least ${min} characters` };
  }

  if (max !== undefined && length > max) {
    return { valid: false, error: `Must be at most ${max} characters` };
  }

  return { valid: true };
}

/**
 * Validate image file type
 */
export function isValidImageType(filename: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

/**
 * Validate image URL (including CDN domains)
 */
export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // Known image hosting domains
    const validDomains = [
      'drive.google.com',
      'googleusercontent.com',
      'images.unsplash.com',
      'unsplash.com',
      'imgur.com',
      'i.imgur.com',
      'cloudinary.com',
      'amazonaws.com',
      'same-assets.com',
    ];

    const isKnownDomain = validDomains.some(domain => hostname.includes(domain));
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(pathname);

    return isKnownDomain || hasImageExtension;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML to prevent XSS
 * Basic sanitization - remove script tags and event handlers
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate VIP tier
 */
export function isValidVipTier(tier: string): boolean {
  const validTiers = ['silver', 'gold', 'black'];
  return validTiers.includes(tier.toLowerCase());
}

/**
 * Validate industry type
 */
export function isValidIndustry(industry: string): boolean {
  const validIndustries = ['music', 'acting', 'modeling', 'culinary', 'sports'];
  return validIndustries.includes(industry.toLowerCase());
}

/**
 * Industry-specific field validation
 * Returns validation errors for industry-specific required/recommended fields
 */
export interface IndustryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateModelingDetails(details: Record<string, unknown>): IndustryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for models
  if (!details.height) {
    errors.push('Height is required for models');
  }

  // Recommended fields (warnings, not errors)
  if (!details.chest && !details.waist && !details.hips) {
    warnings.push('Adding measurements (chest, waist, hips) is recommended');
  }
  if (!details.hair_colour) {
    warnings.push('Hair colour is recommended');
  }
  if (!details.eye_colour) {
    warnings.push('Eye colour is recommended');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateSportsDetails(details: Record<string, unknown>): IndustryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for sports talents
  if (!details.sport_type) {
    errors.push('Sport type is required');
  }

  // Recommended fields
  const positions = details.positions_played as unknown[] | undefined;
  if (!positions || positions.length === 0) {
    warnings.push('Adding positions played is recommended');
  }
  if (!details.current_team) {
    warnings.push('Current team is recommended');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateMusicDetails(details: Record<string, unknown>): IndustryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for music talents
  const genres = details.genre as unknown[] | undefined;
  if (!genres || genres.length === 0) {
    errors.push('At least one genre is required for music talents');
  }

  // Recommended fields
  if (!details.years_active) {
    warnings.push('Years active is recommended');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateActingDetails(details: Record<string, unknown>): IndustryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for acting talents
  const actingTypes = details.acting_type as unknown[] | undefined;
  if (!actingTypes || actingTypes.length === 0) {
    errors.push('At least one acting type is required (Film, TV, Theatre, etc.)');
  }

  // Recommended fields
  if (!details.agencies || (details.agencies as unknown[]).length === 0) {
    warnings.push('Adding representation/agencies is recommended');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateCulinaryDetails(details: Record<string, unknown>): IndustryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for culinary talents
  const specialties = details.cuisine_specialties as unknown[] | undefined;
  if (!specialties || specialties.length === 0) {
    errors.push('At least one cuisine specialty is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate industry-specific details based on the industry type
 */
export function validateIndustryDetails(
  industry: string,
  details: Record<string, unknown> | undefined
): IndustryValidationResult {
  if (!details || Object.keys(details).length === 0) {
    // Return warnings if no details are provided
    return {
      valid: true, // Allow saving without industry details
      errors: [],
      warnings: [`Consider adding ${industry}-specific details to enhance the profile`],
    };
  }

  switch (industry.toLowerCase()) {
    case 'modeling':
      return validateModelingDetails(details);
    case 'sports':
      return validateSportsDetails(details);
    case 'music':
      return validateMusicDetails(details);
    case 'acting':
      return validateActingDetails(details);
    case 'culinary':
      return validateCulinaryDetails(details);
    default:
      return { valid: true, errors: [], warnings: [] };
  }
}

/**
 * Validate event type
 */
export function isValidEventType(type: string): boolean {
  const validTypes = ['performance', 'photoshoot', 'match', 'workshop', 'appearance', 'collaboration'];
  return validTypes.includes(type.toLowerCase());
}

/**
 * Validate event status
 */
export function isValidEventStatus(status: string): boolean {
  const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * Validate order status
 */
export function isValidOrderStatus(status: string): boolean {
  const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * Validate user role
 */
export function isValidUserRole(role: string): boolean {
  const validRoles = ['admin', 'staff', 'artist', 'vip'];
  return validRoles.includes(role.toLowerCase());
}

/**
 * Complex object validation builder
 */
export class Validator<T extends Record<string, unknown>> {
  private errors: Record<string, string[]> = {};

  constructor(private data: T) {}

  required(field: keyof T, message?: string): this {
    if (!this.data[field] || (typeof this.data[field] === 'string' && !isNonEmptyString(this.data[field]))) {
      this.addError(String(field), message || `${String(field)} is required`);
    }
    return this;
  }

  email(field: keyof T, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && !isValidEmail(value)) {
      this.addError(String(field), message || 'Invalid email format');
    }
    return this;
  }

  url(field: keyof T, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && !isValidUrl(value)) {
      this.addError(String(field), message || 'Invalid URL format');
    }
    return this;
  }

  minLength(field: keyof T, min: number, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && value.length < min) {
      this.addError(String(field), message || `Must be at least ${min} characters`);
    }
    return this;
  }

  maxLength(field: keyof T, max: number, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && value.length > max) {
      this.addError(String(field), message || `Must be at most ${max} characters`);
    }
    return this;
  }

  positive(field: keyof T, message?: string): this {
    const value = this.data[field];
    if (value !== undefined && !isPositiveInteger(value)) {
      this.addError(String(field), message || 'Must be a positive number');
    }
    return this;
  }

  custom(field: keyof T, validator: (value: unknown) => boolean, message: string): this {
    if (!validator(this.data[field])) {
      this.addError(String(field), message);
    }
    return this;
  }

  private addError(field: string, message: string) {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
  }

  validate(): { valid: true; data: T } | { valid: false; errors: Record<string, string[]> } {
    if (Object.keys(this.errors).length > 0) {
      return { valid: false, errors: this.errors };
    }
    return { valid: true, data: this.data };
  }

  getErrors(): Record<string, string[]> {
    return this.errors;
  }

  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }
}
