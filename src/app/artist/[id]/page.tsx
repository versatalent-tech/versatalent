import { notFound, redirect } from 'next/navigation';
import { getTalentById } from '@/lib/db/repositories/talents';
import { getUserById } from '@/lib/db/repositories/users';
import { isValidUUID } from '@/lib/utils/validation';

/**
 * Old artist page address. Talent profiles live at /talents/[id]; this
 * forwards there, accepting either a talent id or (from older links) the
 * artist's user id. Card taps arrive with ?from=nfc or ?from=card.
 */
export default async function ArtistRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  if (!isValidUUID(id)) notFound();
  const suffix = from === 'nfc' || from === 'card' ? '?from=card' : '';

  const talent = await getTalentById(id);
  if (talent?.is_active) redirect(`/talents/${talent.id}${suffix}`);

  const user = talent ? null : await getUserById(id);
  if (user?.talent_id) redirect(`/talents/${user.talent_id}${suffix}`);

  notFound();
}
