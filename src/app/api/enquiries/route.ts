import { NextRequest } from 'next/server';
import { publicEnquirySchema } from '@/lib/crm/schemas';
import { countRecentEnquiriesFromIp, createEnquiry } from '@/lib/db/repositories/crm';
import { getClientIp } from '@/lib/auth/login-throttle';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';
import { HONEYPOT_FIELD } from '@/lib/crm/types';

export const dynamic = 'force-dynamic';

const MAX_PER_IP_PER_HOUR = 5;

/** Website form name → enquiry type */
const FORMS = {
  'versatalent-contact': 'contact',
  'versatalent-brand': 'brand',
  'versatalent-talent': 'talent',
} as const;

function clean(value: string | undefined, max = 500): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * POST /api/enquiries - public. The website forms send a copy of each
 * submission here (Netlify Forms still receives it for email alerts).
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => undefined);
  const formName = json && typeof json.formName === 'string' ? json.formName : '';
  const parsed = publicEnquirySchema.safeParse({
    form: FORMS[formName as keyof typeof FORMS],
    fields: json?.fields,
  });
  if (!parsed.success) return ApiErrors.BadRequest('Invalid form submission');

  const { form, fields } = parsed.data;

  // Pretend success to bots so they don't retry
  if (fields[HONEYPOT_FIELD]) return successResponse(null);

  try {
    const ip = getClientIp(request);
    if ((await countRecentEnquiriesFromIp(ip)) >= MAX_PER_IP_PER_HOUR) {
      return ApiErrors.BadRequest('Too many messages from this connection. Please email us instead.');
    }

    const name = clean(fields.name) ?? clean([fields.firstName, fields.lastName].filter(Boolean).join(' '));
    const email = clean(fields.email, 200)?.toLowerCase() ?? null;
    if (!email && !clean(fields.phone)) return ApiErrors.BadRequest('Please include an email or phone number');

    const extra = form === 'talent'
      ? [
          fields.industry && `Industry: ${fields.industry}`,
          fields.portfolioLink && `Portfolio: ${fields.portfolioLink}`,
          fields.experience && `Experience:\n${fields.experience}`,
        ].filter(Boolean)
      : [];

    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key !== 'form-name' && key !== HONEYPOT_FIELD && value.trim()) payload[key] = value.trim();
    }

    await createEnquiry({
      form,
      name,
      email,
      phone: clean(fields.phone, 50),
      company: clean(fields.company, 200),
      subject: clean(fields.subject, 300) ?? (form === 'talent' ? clean(fields.industry, 100) : null),
      message: clean([...extra, fields.message].filter(Boolean).join('\n\n'), 10000),
      payload,
      ip,
    });

    return successResponse(null, 'Thanks, we got your message', 201);
  } catch (error) {
    console.error('Error saving enquiry:', error);
    return ApiErrors.ServerError('Failed to save your message');
  }
}
