import type { z } from 'zod';
import type { dealSchema } from './schemas';
import {
  getContact,
  getOrganisation,
  isAssignableOwner,
  talentsAllowed,
  type CrmScope,
} from '@/lib/db/repositories/crm';

/**
 * Check what a deal points at: talents within the person's scope, an owner
 * who is an active admin or manager, and a client and contact they can see.
 * Returns a message to show, or null when everything is fine.
 */
export async function checkDealLinks(
  scope: CrmScope,
  data: Partial<z.infer<typeof dealSchema>>,
  existingTalentIds: string[] = []
): Promise<string | null> {
  // Talents already on the deal may stay even if they're outside this person's scope
  const added = data.talent_ids?.filter((id) => !existingTalentIds.includes(id)) ?? [];
  if (!talentsAllowed(scope, added)) {
    return 'You can only add talents assigned to you';
  }
  if (data.owner_user_id && !(await isAssignableOwner(data.owner_user_id))) {
    return 'The owner must be an active admin or manager';
  }
  if (data.organisation_id && !(await getOrganisation(scope, data.organisation_id))) {
    return 'Client not found';
  }
  if (data.contact_id && !(await getContact(scope, data.contact_id))) {
    return 'Contact not found';
  }
  return null;
}
