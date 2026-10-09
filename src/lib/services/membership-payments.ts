/**
 * Paying the membership card delivery fee online (SumUp Hosted Checkout).
 *
 * The member is sent to a SumUp-hosted page, so card details never reach
 * VersaTalent. SumUp's redirect and status-change callback are only hints:
 * the fee counts as paid after we read the checkout back from SumUp and it
 * is PAID, for our merchant, with the exact amount, currency and reference.
 * Every checkout is remembered, so paying on an older payment page still
 * counts (and a second payment is flagged for refund).
 */
import {
  getCheckoutRecord,
  getPaymentTarget,
  markCardFeePaid,
  markCardFeeUnpaid,
  recordCheckout,
  setCheckoutOutcome,
  type CheckoutRecord,
  type PaymentTarget,
} from '@/lib/db/repositories/membership';
import {
  activateMembership,
  getFoundingCheckout,
  getLatestFoundingCheckout,
  getPendingPurchase,
  markFoundingUnpaid,
  recordFoundingCheckout,
  setFoundingCheckoutOutcome,
  type FoundingCheckoutRecord,
  type PendingPurchase,
} from '@/lib/db/repositories/founding';
import { createHostedCheckout, getCheckout, judgeOnlineCheckout } from '@/lib/services/sumup';
import { FOUNDING_NAME } from '@/lib/membership/founding';

export type CardPaymentState = 'paid' | 'pending' | 'failed' | 'expired';

/** Start (or restart) payment for an unpaid request; returns the SumUp page to send the member to */
export async function startCardPayment(requestId: string, origin: string): Promise<{ url: string } | { error: string }> {
  const target = await getPaymentTarget({ requestId });
  if (!target) return { error: 'Application not found' };
  if (target.status !== 'awaiting_payment' || target.payment_status === 'paid' || target.payment_status === 'waived') {
    return { error: 'This application has already been paid for' };
  }
  if (target.paid_membership_id) return { error: 'Your card is included in your Founding Membership' };

  // A new, unique reference per attempt (SumUp rejects reused references)
  const reference = `vtcard-${target.id}-${target.payment_attempts + 1}`;
  const checkout = await createHostedCheckout({
    reference,
    amountCents: target.fee_cents,
    currency: target.currency,
    description: 'VersaTalent membership card delivery',
    redirectUrl: `${origin}/membership/welcome?r=${target.id}`,
    returnUrl: `${origin}/api/webhooks/sumup-online`,
  });

  if (!(await recordCheckout(target, checkout.id, reference))) {
    return { error: 'This application has already been paid for' };
  }
  return { url: checkout.url };
}

/** Read one checkout back from SumUp and record what it means (safe to call repeatedly) */
export async function confirmCheckout(record: CheckoutRecord): Promise<CardPaymentState> {
  const checkout = await getCheckout(record.checkout_id);
  if (!checkout) return 'pending';

  const outcome = judgeOnlineCheckout(checkout, {
    amountCents: record.amount_cents,
    currency: record.currency,
    reference: record.reference,
  });

  if (outcome.state === 'paid') {
    await setCheckoutOutcome(record.checkout_id, 'paid', outcome.transactionCode);
    await markCardFeePaid(record.request_id, record.checkout_id, outcome.transactionCode);
    return 'paid';
  }
  if (outcome.state === 'failed' || outcome.state === 'expired') {
    console.warn(`[membership] Checkout ${record.checkout_id}: ${outcome.reason}`);
    await setCheckoutOutcome(record.checkout_id, outcome.state);
    // Only the latest payment page decides what the member sees
    await markCardFeeUnpaid(record.request_id, record.checkout_id, outcome.state);
    return outcome.state;
  }
  return 'pending';
}

/** For the welcome page: check the request's latest payment page */
export async function confirmCardPayment(target: PaymentTarget): Promise<CardPaymentState> {
  if (['paid', 'waived', 'included'].includes(target.payment_status)) return 'paid';
  if (!target.sumup_checkout_id) return 'pending';
  const record = await getCheckoutRecord(target.sumup_checkout_id);
  return record ? confirmCheckout(record) : 'pending';
}

// ---------------------------------------------------------------------------
// Founding Membership (same rules: only a PAID checkout we read back counts)
// ---------------------------------------------------------------------------

/** Send the member to SumUp to pay for a prepared Founding purchase */
export async function startFoundingPayment(purchase: PendingPurchase, origin: string): Promise<{ url: string } | { error: string }> {
  const reference = `vtfound-${purchase.id}-${purchase.payment_attempts + 1}`;
  const checkout = await createHostedCheckout({
    reference,
    amountCents: purchase.price_cents,
    currency: purchase.currency,
    description: FOUNDING_NAME,
    redirectUrl: `${origin}/membership/welcome?f=${purchase.id}`,
    returnUrl: `${origin}/api/webhooks/sumup-online`,
  });
  if (!(await recordFoundingCheckout(purchase, checkout.id, reference))) {
    return { error: 'This membership has already been paid for' };
  }
  return { url: checkout.url };
}

/** Pay again for an unpaid purchase (thank-you page "Pay now") */
export async function restartFoundingPayment(membershipId: string, origin: string): Promise<{ url: string } | { error: string }> {
  const purchase = await getPendingPurchase(membershipId);
  if (!purchase) return { error: 'Membership not found' };
  if (purchase.status !== 'pending' && purchase.status !== 'payment_failed') {
    return { error: purchase.status === 'active' ? 'This membership has already been paid for' : 'This purchase is closed. Start a new one from your pass.' };
  }
  return startFoundingPayment(purchase, origin);
}

export async function confirmFoundingCheckout(record: FoundingCheckoutRecord): Promise<CardPaymentState> {
  const checkout = await getCheckout(record.checkout_id);
  if (!checkout) return 'pending';

  const outcome = judgeOnlineCheckout(checkout, {
    amountCents: record.amount_cents,
    currency: record.currency,
    reference: record.reference,
  });

  if (outcome.state === 'paid') {
    await setFoundingCheckoutOutcome(record.checkout_id, 'paid', outcome.transactionCode);
    await activateMembership(record.membership_id, { checkoutId: record.checkout_id, transactionCode: outcome.transactionCode, source: 'online' });
    return 'paid';
  }
  if (outcome.state === 'failed' || outcome.state === 'expired') {
    console.warn(`[founding] Checkout ${record.checkout_id}: ${outcome.reason}`);
    await setFoundingCheckoutOutcome(record.checkout_id, outcome.state);
    await markFoundingUnpaid(record.membership_id, record.checkout_id);
    return outcome.state;
  }
  return 'pending';
}

/** Thank-you page: check the purchase's latest payment page */
export async function confirmFoundingPayment(membershipId: string): Promise<void> {
  const record = await getLatestFoundingCheckout(membershipId);
  if (record && record.outcome === 'pending') await confirmFoundingCheckout(record);
}

/** Webhook: any payment page we created, for a card fee or a Founding purchase */
export async function confirmAnyCheckout(checkoutId: string): Promise<string | null> {
  const card = await getCheckoutRecord(checkoutId);
  if (card) return `Card request ${card.request_id}: ${await confirmCheckout(card)}`;
  const founding = await getFoundingCheckout(checkoutId);
  if (founding) return `Founding purchase ${founding.membership_id}: ${await confirmFoundingCheckout(founding)}`;
  return null;
}
