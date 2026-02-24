/**
 * API Response Utilities
 * Standardized response formats for all API endpoints
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string,
  status = 500,
  details?: unknown,
  code?: string
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error,
      ...(details && { details }),
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const ApiErrors = {
  Unauthorized: (message = 'Unauthorized') =>
    errorResponse(message, 401, undefined, 'UNAUTHORIZED'),

  Forbidden: (message = 'Forbidden') =>
    errorResponse(message, 403, undefined, 'FORBIDDEN'),

  NotFound: (resource = 'Resource') =>
    errorResponse(`${resource} not found`, 404, undefined, 'NOT_FOUND'),

  BadRequest: (message = 'Bad request') =>
    errorResponse(message, 400, undefined, 'BAD_REQUEST'),

  ValidationError: (details: unknown) =>
    errorResponse('Validation failed', 400, details, 'VALIDATION_ERROR'),

  ServerError: (message = 'Internal server error') =>
    errorResponse(message, 500, undefined, 'SERVER_ERROR'),

  MethodNotAllowed: (method: string) =>
    errorResponse(`Method ${method} not allowed`, 405, undefined, 'METHOD_NOT_ALLOWED'),
};

/**
 * Parse and validate request JSON body
 */
export async function parseRequestBody<T = unknown>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Extract query parameters from URL
 */
export function getQueryParams(request: Request): URLSearchParams {
  const { searchParams } = new URL(request.url);
  return searchParams;
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Log API errors with context
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(`[API Error] ${endpoint}:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}

/**
 * Create a typed API handler with automatic error handling
 */
export function createApiHandler<T>(
  handler: (request: Request, context?: { params: Record<string, string> }) => Promise<T>
) {
  return async (
    request: Request,
    context?: { params: Record<string, string> }
  ) => {
    try {
      const result = await handler(request, context);
      return successResponse(result);
    } catch (error) {
      logApiError(request.url, error);

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('not found')) {
          return ApiErrors.NotFound();
        }
        if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
          return ApiErrors.Unauthorized();
        }
        if (error.message.includes('validation') || error.message.includes('Invalid')) {
          return ApiErrors.ValidationError(error.message);
        }

        return errorResponse(error.message, 500);
      }

      return ApiErrors.ServerError();
    }
  };
}
