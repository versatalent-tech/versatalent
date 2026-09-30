/**
 * VIP profile fields shared by the admin form and the API.
 */

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const INTERESTS = [
  'Music',
  'Fashion',
  'Modelling',
  'Sport',
  'Food & Drink',
  'Nightlife',
  'Arts & Culture',
  'Film & TV',
] as const;

export const REFERRAL_SOURCES = [
  'Instagram',
  'TikTok',
  'Friend or family',
  'At an event',
  'Google',
  'Other',
] as const;

export interface VIPProfileInput {
  phone?: string | null;
  age_range?: AgeRange | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  interests?: string[];
  referral_source?: string | null;
  consent_email?: boolean;
  consent_sms?: boolean;
  consent_post?: boolean;
  notes?: string | null;
}

export interface VIPProfile extends Required<Omit<VIPProfileInput, 'interests'>> {
  user_id: string;
  interests: string[];
  consent_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_TEXT = 200;

function cleanText(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/**
 * Validate and normalise profile input from a request body.
 * Returns the cleaned profile, or an error message.
 */
export function parseVIPProfileInput(body: any): { profile: VIPProfileInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid profile data' };
  }

  const ageRange = body.age_range || null;
  if (ageRange !== null && !AGE_RANGES.includes(ageRange)) {
    return { error: 'Invalid age range' };
  }

  const interests = Array.isArray(body.interests)
    ? body.interests.filter((i: unknown): i is string => typeof i === 'string' && (INTERESTS as readonly string[]).includes(i))
    : [];

  const referral = cleanText(body.referral_source, 50);
  if (referral && !(REFERRAL_SOURCES as readonly string[]).includes(referral)) {
    return { error: 'Invalid referral source' };
  }

  return {
    profile: {
      phone: cleanText(body.phone, 30),
      age_range: ageRange,
      address_line1: cleanText(body.address_line1),
      address_line2: cleanText(body.address_line2),
      city: cleanText(body.city, 100),
      postcode: cleanText(body.postcode, 20)?.toUpperCase() ?? null,
      country: cleanText(body.country, 100),
      interests,
      referral_source: referral,
      consent_email: body.consent_email === true,
      consent_sms: body.consent_sms === true,
      consent_post: body.consent_post === true,
      notes: cleanText(body.notes, 1000),
    },
  };
}
