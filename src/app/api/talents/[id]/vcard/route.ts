import { NextRequest, NextResponse } from 'next/server';
import { getTalentById } from '@/lib/db/repositories/talents';
import { AGENCY_CONTACT } from '@/lib/site-contact';
import { SITE_URL } from '@/lib/site-url';
import { isValidUUID } from '@/lib/utils/validation';

export const dynamic = 'force-dynamic';

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * GET /api/talents/[id]/vcard - the agency's booking contact as a contact
 * card, with a note and link for this talent. It's how a prospect keeps the
 * way to book them; it never contains the talent's own phone or email.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const talent = isValidUUID(id) ? await getTalentById(id) : null;
  if (!talent || !talent.is_active) return new NextResponse('Not found', { status: 404 });

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(AGENCY_CONTACT.name)}`,
    `N:;${escape(AGENCY_CONTACT.name)};;;`,
    `ORG:${escape(AGENCY_CONTACT.organisation)}`,
    `TITLE:${escape(`Bookings for ${talent.name}`)}`,
    `TEL;TYPE=WORK,VOICE:${AGENCY_CONTACT.phone}`,
    `EMAIL;TYPE=WORK:${AGENCY_CONTACT.email}`,
    `URL:${SITE_URL}/talents/${talent.id}`,
    `NOTE:${escape(`To book ${talent.name}${talent.profession ? ` (${talent.profession})` : ''}, contact VersaTalent.`)}`,
    'END:VCARD',
  ];
  const filename = `VersaTalent - ${talent.name}.vcf`.replace(/[^\w .-]/g, '');

  return new NextResponse(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
