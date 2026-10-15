/**
 * Paying for tickets online (SumUp Hosted Checkout), same rules as the
 * membership payments: the buyer pays on SumUp's page, and an order only
 * counts as paid once we read the checkout back from SumUp and it is PAID,
 * for our merchant, with the exact amount, currency and reference.
 *
 * When an order is paid, a member buying with their membership email earns
 * points (the "ticket_purchase" rule, per £1, times their tier rate).
 */
import {
  findMemberByEmail,
  getLatestTicketCheckout,
  getPayableOrder,
  getTicketCheckout,
  markTicketOrderPaid,
  markTicketOrderRefunded,
  markTicketOrderUnpaid,
  recordTicketCheckout,
  renewHold,
  setOrderPoints,
  setTicketCheckoutOutcome,
  type PayableOrder,
  type TicketCheckoutRecord,
} from '@/lib/db/repositories/tickets';
import { getPointRuleByActionType } from '@/lib/db/repositories/vip-point-rules';
import { reverseEarnedPoints } from '@/lib/db/repositories/loyalty';
import { qualifyReferral } from '@/lib/db/repositories/referrals';
import { awardPoints } from '@/lib/services/vip-points-service';
import { createHostedCheckout, getCheckout, judgeOnlineCheckout } from '@/lib/services/sumup';
import type { CardPaymentState } from '@/lib/services/membership-payments';

/** Send the buyer to SumUp; returns the payment page */
export async function startTicketPayment(order: PayableOrder, origin: string): Promise<{ url: string } | { error: string }> {
  if (order.status === 'paid') return { error: 'This order has already been paid for' };
  if (!['pending', 'payment_failed', 'expired'].includes(order.status)) return { error: 'This order is closed. Please start a new one.' };
  if (!(await renewHold(order.id))) return { error: 'Sorry, these tickets have sold out since you started. Please start a new order.' };

  const reference = `vttix-${order.id}-${order.payment_attempts + 1}`;
  const checkout = await createHostedCheckout({
    reference,
    amountCents: order.total_cents,
    currency: order.currency,
    description: `${order.quantity} × ticket: ${order.event_title}`.slice(0, 250),
    redirectUrl: `${origin}/tickets/order/${order.id}?k=${encodeURIComponent(order.access_token)}`,
    returnUrl: `${origin}/api/webhooks/sumup-online`,
  });
  if (!(await recordTicketCheckout(order, checkout.id, reference))) {
    return { error: 'This order has already been paid for' };
  }
  return { url: checkout.url };
}

/** Free orders need no payment page */
export async function completeFreeOrder(orderId: string): Promise<void> {
  if (await markTicketOrderPaid(orderId, null, null)) await afterTicketOrderPaid(orderId);
}

export async function confirmTicketCheckout(record: TicketCheckoutRecord): Promise<CardPaymentState> {
  const checkout = await getCheckout(record.checkout_id);
  if (!checkout) return 'pending';

  const outcome = judgeOnlineCheckout(checkout, {
    amountCents: record.amount_cents,
    currency: record.currency,
    reference: record.reference,
  });

  if (outcome.state === 'paid') {
    await setTicketCheckoutOutcome(record.checkout_id, 'paid', outcome.transactionCode);
    // Paid on an older payment page still counts (a second payment shows in SumUp for refund)
    if (await markTicketOrderPaid(record.order_id, record.checkout_id, outcome.transactionCode)) {
      await afterTicketOrderPaid(record.order_id);
    }
    return 'paid';
  }
  if (outcome.state === 'failed' || outcome.state === 'expired') {
    console.warn(`[tickets] Checkout ${record.checkout_id}: ${outcome.reason}`);
    await setTicketCheckoutOutcome(record.checkout_id, outcome.state);
    await markTicketOrderUnpaid(record.order_id, record.checkout_id, outcome.state);
    return outcome.state;
  }
  return 'pending';
}

/** Order page: check the order's latest payment page while it's unpaid */
export async function confirmTicketPayment(orderId: string): Promise<void> {
  const record = await getLatestTicketCheckout(orderId);
  if (record && record.outcome === 'pending') await confirmTicketCheckout(record);
}

/** Webhook: a ticket payment page, if this checkout is one */
export async function confirmTicketWebhook(checkoutId: string): Promise<string | null> {
  const record = await getTicketCheckout(checkoutId);
  return record ? `Ticket order ${record.order_id}: ${await confirmTicketCheckout(record)}` : null;
}

/** Points for members; never stops the order from being paid */
async function afterTicketOrderPaid(orderId: string): Promise<void> {
  try {
    const order = await getPayableOrder(orderId);
    if (!order || order.total_cents <= 0) return;
    const memberId = await findMemberByEmail(order.email);
    if (!memberId) return;

    const rule = await getPointRuleByActionType('ticket_purchase');
    const amount = order.total_cents / 100;
    const points = rule ? Math.floor(Math.round(amount * Number(rule.points_per_unit) * 1000) / 1000) : 0;
    let awarded = 0;
    if (points > 0) {
      const result = await awardPoints(
        memberId,
        'ticket_purchase',
        points,
        { order_id: orderId, reference: order.reference, event: order.event_title, amount, currency: order.currency },
        orderId,
        { applyTierMultiplier: true, sourceKey: `ticket:${orderId}` }
      );
      awarded = result.pointsAwarded;
    }
    await setOrderPoints(orderId, memberId, awarded);
    await qualifyReferral(memberId, 'order', order.total_cents).catch((error) => console.error('Referral qualification failed:', error));
  } catch (error) {
    console.error(`[tickets] Points for order ${orderId} failed:`, error);
  }
}

/** Admin: the money was refunded in SumUp; mark the order and take back its points */
export async function refundTicketOrder(
  orderId: string,
  reason: string | null,
  actorId: string | null
): Promise<{ ok: true; pointsReversed: number } | { ok: false; error: string }> {
  const result = await markTicketOrderRefunded(orderId, reason, actorId);
  if (result.ok === false) return { ok: false, error: result.error };
  const pointsReversed = await reverseEarnedPoints(`ticket:${orderId}`, `ticket_refund:${orderId}`, orderId, { ticket_order_id: orderId }, actorId);
  return { ok: true as const, pointsReversed };
}
