import type { z } from 'zod';
import type { meetingSchema } from '@/lib/crm/schemas';
import type { Meeting } from '@/lib/crm/types';
import { getDeal, getOrganisation, talentsAllowed, type CrmScope } from '@/lib/db/repositories/crm';

/**
 * Check a meeting's deal, client and talents are ones the person may use.
 * Links already on the meeting may stay (as with deals). Returns a message to
 * show, or null when everything is fine.
 */
export async function checkMeetingLinks(
  scope: CrmScope,
  data: z.infer<typeof meetingSchema>,
  existing: Meeting | null = null
): Promise<string | null> {
  const addedTalents = data.talent_ids.filter((id) => !existing?.talents.some((t) => t.id === id));
  if (!talentsAllowed(scope, addedTalents)) return 'You can only add talents assigned to you';
  if (data.deal_id && data.deal_id !== existing?.deal?.id && !(await getDeal(scope, data.deal_id))) {
    return 'Deal not found';
  }
  if (
    data.organisation_id &&
    data.organisation_id !== existing?.organisation?.id &&
    !(await getOrganisation(scope, data.organisation_id))
  ) {
    return 'Client not found';
  }
  return null;
}
