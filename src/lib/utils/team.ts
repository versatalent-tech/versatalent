import type { NextRequest } from 'next/server';
import { isValidUUID } from '@/lib/utils/validation';

/** Roles that work with a set of assigned talents */
export const ASSIGNABLE_ROLES: readonly string[] = ['manager', 'road_manager'];

/** Full URL of the page where someone sets their password from a one-time link */
export function setupLink(request: NextRequest, token: string): string {
  return `${request.nextUrl.origin}/account/setup?token=${encodeURIComponent(token)}`;
}

/** Validate a list of talent IDs from a request body; null when invalid */
export function parseTalentIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string' && isValidUUID(id))) {
    return null;
  }
  return [...new Set(value as string[])];
}
