import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE } from './env';

const baseURL = `http://localhost:${process.env.E2E_PORT || 3100}`;

/** An API client signed in as the admin */
export function adminApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL, storageState: ADMIN_STATE });
}

/** An API client signed in as a team member (email and password) */
export async function teamApi(email: string, password: string): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });
  const response = await context.post('/api/admin/auth/login', { data: { username: email, password } });
  if (!response.ok()) throw new Error(`Sign-in failed for ${email}: ${response.status()}`);
  return context;
}

export async function anonymousApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL });
}

/** An API client signed in to the talent portal */
export async function portalApi(email: string, password: string): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });
  const response = await context.post('/api/portal/auth/login', { data: { email, password } });
  if (!response.ok()) throw new Error(`Portal sign-in failed for ${email}: ${response.status()}`);
  return context;
}
