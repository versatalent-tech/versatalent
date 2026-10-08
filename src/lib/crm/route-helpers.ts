import type { z } from 'zod';
import { requireTeamPermission, type TeamSession } from '@/lib/middleware/auth';
import type { Permission } from '@/lib/auth/permissions';
import { getCrmScope, type CrmActor, type CrmScope } from '@/lib/db/repositories/crm';
import { ApiErrors } from '@/lib/utils/api-response';
import { firstIssue } from './schemas';

export interface CrmContext {
  session: TeamSession;
  scope: CrmScope;
  actor: CrmActor;
}

/** Signed-in team member with the permission, plus their CRM scope; or a response to return */
export async function crmContext(permission: Permission): Promise<CrmContext | { response: Response }> {
  const auth = await requireTeamPermission(permission);
  if ('response' in auth) return auth;
  const scope = await getCrmScope(auth.session);
  return {
    session: auth.session,
    scope,
    actor: { userId: auth.session.userId ?? null, name: auth.session.name ?? null },
  };
}

/** Parse a JSON body with a Zod schema; returns the data or a 400 response */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<{ data: z.infer<S> } | { response: Response }> {
  const json = await request.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) {
    return { response: ApiErrors.BadRequest(firstIssue(result.error)) };
  }
  return { data: result.data };
}
