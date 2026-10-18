import type { Metadata } from 'next';
import { getTalentById } from '@/lib/db/repositories/talents';
import { SITE_URL } from '@/lib/site-url';
import { isValidUUID } from '@/lib/utils/validation';

/**
 * Link previews for talent pages (WhatsApp, iMessage, social): name,
 * profession, tagline and photo. Only active talents get a preview.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const talent = isValidUUID(id) ? await getTalentById(id).catch(() => null) : null;
  if (!talent || !talent.is_active) return { title: 'VersaTalent' };

  const title = `${talent.name}${talent.profession ? ` · ${talent.profession}` : ''} | VersaTalent`;
  const description = talent.tagline || `${talent.name} is represented by VersaTalent. Enquire about bookings.`;
  const image = talent.image_src ? new URL(talent.image_src, SITE_URL).toString() : undefined;
  const url = `${SITE_URL}/talents/${talent.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile', siteName: 'VersaTalent', ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default function TalentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
