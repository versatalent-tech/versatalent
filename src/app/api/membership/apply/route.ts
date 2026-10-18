import { NextRequest } from 'next/server';
import { applicationSchema } from '@/lib/membership/schemas';
import { firstIssue } from '@/lib/crm/schemas';
import { HONEYPOT_FIELD } from '@/lib/crm/types';
import { getProgrammeSettings, submitApplication } from '@/lib/db/repositories/membership';
import { getFoundingSettings, getPendingPurchase } from '@/lib/db/repositories/founding';
import { attachReferral, findReferralCodeOwner, getReferralConfig } from '@/lib/db/repositories/referrals';
import { startCardPayment, startFoundingPayment } from '@/lib/services/membership-payments';
import { getClientIp, isLoginThrottled, recordLoginAttempt } from '@/lib/auth/login-throttle';
import { SumUpNotConfiguredError } from '@/lib/services/sumup';
import { ApiErrors, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const EMAIL_IN_USE =
  'We can’t start a new application with this email. If you’re already a member, contact us at versatalent.management@gmail.com.';

/**
 * POST /api/membership/apply - public membership application.
 * Creates the member and card request, then returns the SumUp payment page:
 * the card delivery fee, or the Founding Membership (delivery included) when
 * they chose it. If payment can't start, the application is kept and the
 * welcome page lets them pay later.
 */
export async function POST(request: NextRequest) {
  const [settings, founding] = await Promise.all([getProgrammeSettings(), getFoundingSettings()]);
  if (!settings.signup_open) return ApiErrors.BadRequest('Applications are not open yet. Please check back soon.');

  const json = await request.json().catch(() => undefined);
  if (json?.[HONEYPOT_FIELD]) return successResponse({ requestId: null, paymentUrl: null }); // bots: pretend it worked

  const parsed = applicationSchema.safeParse(json);
  if (!parsed.success) return ApiErrors.BadRequest(firstIssue(parsed.error));
  const input = parsed.data;
  if (input.plan === 'founding' && !founding.founding_on_sale) {
    return ApiErrors.BadRequest('The Founding Membership isn’t on sale at the moment. Choose the free membership to join now.');
  }

  // A referral code must belong to another member (checked before anything is saved)
  if (input.referral_code) {
    const [referrer, referrals] = await Promise.all([findReferralCodeOwner(input.referral_code), getReferralConfig()]);
    if (!referrals.open || !referrer) return ApiErrors.BadRequest('That referral code isn’t valid. Check it, or leave it empty.');
    if (referrer.email.toLowerCase() === input.email) return ApiErrors.BadRequest('You can’t use your own referral code.');
  }

  // At most 5 applications per email and 20 per connection in 15 minutes
  const ip = getClientIp(request);
  const throttleKey = `membership-apply:${input.email}`;
  if (await isLoginThrottled(throttleKey, ip)) {
    return ApiErrors.BadRequest('Too many attempts. Please try again in 15 minutes.');
  }
  await recordLoginAttempt(throttleKey, ip, false);

  let result;
  try {
    result = await submitApplication(input, settings, founding);
  } catch (error: any) {
    if (error?.code === '23505') return ApiErrors.BadRequest(EMAIL_IN_USE); // same email submitted twice at once
    console.error('Membership application error:', error);
    return ApiErrors.ServerError('We couldn’t save your application. Please try again.');
  }
  if (!result.ok) {
    return ApiErrors.BadRequest(result.reason === 'founding_unavailable' ? `${result.error} Choose the free membership to join now.` : EMAIL_IN_USE);
  }
  const ids = { requestId: result.requestId, membershipId: result.membershipId };
  if (input.referral_code) {
    await attachReferral(result.userId, input.referral_code).catch((error) => console.error('Referral attribution failed:', error));
  }

  try {
    let payment: { url: string } | { error: string };
    if (result.membershipId) {
      const purchase = await getPendingPurchase(result.membershipId);
      payment = purchase ? await startFoundingPayment(purchase, request.nextUrl.origin) : { error: 'Membership not found' };
    } else {
      payment = await startCardPayment(result.requestId, request.nextUrl.origin);
    }
    return successResponse({ ...ids, paymentUrl: 'url' in payment ? payment.url : null }, 'Application saved');
  } catch (error) {
    if (!(error instanceof SumUpNotConfiguredError)) console.error('Membership payment could not start:', error);
    // Keep the application; the welcome page offers "Pay now" again
    return successResponse({ ...ids, paymentUrl: null }, 'Application saved; payment could not start');
  }
}
