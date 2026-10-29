import type { Metadata } from 'next';
import { LegalPage } from '@/components/membership/LegalPage';
import { getDeletionRequest } from '@/lib/db/repositories/instagram-accounts';
import { AGENCY_CONTACT } from '@/lib/site-contact';

export const metadata: Metadata = { title: 'Instagram data deletion | VersaTalent', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Where Meta sends people to check a data deletion request (see /api/instagram/data-deletion) */
export default async function InstagramDataDeletionPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const request = code && /^[0-9a-f]{24}$/.test(code) ? await getDeletionRequest(code).catch(() => null) : null;

  return (
    <LegalPage title="Instagram data deletion" updated="October 2026">
      {request ? (
        <p>
          Request <strong>{code}</strong> was received on {new Date(request.requested_at).toLocaleDateString('en-GB')}.{' '}
          {request.completed_at
            ? 'Your connected Instagram account and everything we collected from it (its access, posts and figures) has been deleted.'
            : 'We are deleting your data now.'}
        </p>
      ) : (
        <p>We couldn&apos;t find that request. Check the link, or contact us and we&apos;ll help.</p>
      )}
      <p>
        You can also remove VersaTalent&apos;s access at any time in Instagram: Settings → Website permissions → Apps and
        websites. Questions: <a href={`mailto:${AGENCY_CONTACT.email}`}>{AGENCY_CONTACT.email}</a>.
      </p>
    </LegalPage>
  );
}
