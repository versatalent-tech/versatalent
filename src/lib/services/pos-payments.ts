/**
 * Completing POS payments
 *
 * Every way an order gets paid (SumUp reader webhook, the till's status
 * check, a SumUp app transaction code, cash) goes through completeOrderPayment,
 * so the order is marked paid once and VIP points are awarded once.
 */
import {
  getOrderById,
  markOrderPaid,
} from '@/lib/db/repositories/pos-orders';
import { processPOSOrderForVIP } from '@/lib/services/pos-vip-integration';
import {
  checkAppPaymentTiming,
  checkTransactionPaysOrder,
  getTransaction,
  SumUpNotConfiguredError,
  type SumUpTransaction,
} from '@/lib/services/sumup';
import type { PaymentMethod, POSOrder } from '@/lib/db/types';

export interface PaymentResult {
  order: POSOrder;
  /** false if the order was already paid (nothing changed) */
  newlyPaid: boolean;
  pointsAwarded: number;
}

export async function completeOrderPayment(
  orderId: string,
  payment: { method: PaymentMethod; sumupTransactionCode?: string | null }
): Promise<PaymentResult> {
  const { order, transitioned } = await markOrderPaid(orderId, payment);
  if (!order) {
    throw new Error('Order not found');
  }

  let pointsAwarded = 0;
  if (transitioned && order.customer_user_id) {
    const vip = await processPOSOrderForVIP(order);
    if (vip.success) {
      pointsAwarded = vip.pointsAwarded ?? 0;
    } else {
      // The payment stands; points can be adjusted manually in Admin > VIP
      console.error(`[payments] VIP points failed for order ${orderId}: ${vip.error}`);
    }
  }

  return { order, newlyPaid: transitioned, pointsAwarded };
}

export type ReaderPaymentStatus =
  | { status: 'paid'; result: PaymentResult }
  | { status: 'pending' }
  | { status: 'failed'; reason: string };

/**
 * Check a reader payment with SumUp and complete the order if it succeeded.
 * Used by the webhook and by the till while it waits.
 */
export async function syncReaderPayment(order: POSOrder): Promise<ReaderPaymentStatus> {
  if (order.status === 'paid') {
    return { status: 'paid', result: { order, newlyPaid: false, pointsAwarded: 0 } };
  }
  if (order.status !== 'pending') {
    return { status: 'failed', reason: `Order is ${order.status}` };
  }
  if (!order.sumup_client_transaction_id) {
    return { status: 'failed', reason: 'No payment was sent to a reader for this order' };
  }

  const transaction = await getTransaction({ client_transaction_id: order.sumup_client_transaction_id });
  if (!transaction) {
    // Not created yet: the customer hasn't presented a card
    return { status: 'pending' };
  }

  const check = checkTransactionPaysOrder(transaction, order);
  if (check.ok) {
    const result = await completeOrderPayment(order.id, {
      method: 'sumup_reader',
      sumupTransactionCode: transaction.transaction_code,
    });
    return { status: 'paid', result };
  }
  if (check.pending) {
    return { status: 'pending' };
  }
  return { status: 'failed', reason: check.reason };
}

/**
 * Complete an order with a payment taken in the SumUp app (e.g. Tap to Pay
 * on iPhone), identified by its transaction code.
 */
export async function confirmAppPayment(
  orderId: string,
  transactionCode: string
): Promise<{ ok: boolean; result?: PaymentResult; reason?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, reason: 'Order not found' };
  if (order.status === 'paid') {
    return { ok: true, result: { order, newlyPaid: false, pointsAwarded: 0 } };
  }
  if (order.status !== 'pending') return { ok: false, reason: `Order is ${order.status}` };

  let transaction: SumUpTransaction | null;
  try {
    transaction = await getTransaction({ transaction_code: transactionCode });
  } catch (error) {
    // Not configured: let the route explain that card payments aren't set up
    if (error instanceof SumUpNotConfiguredError) throw error;
    console.error('[payments] SumUp lookup failed:', error);
    return { ok: false, reason: 'Could not reach SumUp to check the payment. Try again.' };
  }
  if (!transaction) {
    return { ok: false, reason: 'No SumUp payment found with that transaction code' };
  }

  const check = checkTransactionPaysOrder(transaction, order);
  if (!check.ok) return { ok: false, reason: check.reason };

  const timing = checkAppPaymentTiming(transaction, order.created_at);
  if (!timing.ok) return { ok: false, reason: timing.reason };

  try {
    const result = await completeOrderPayment(order.id, {
      method: 'sumup_app',
      sumupTransactionCode: transaction.transaction_code,
    });
    return { ok: true, result };
  } catch (error: any) {
    // Unique index: this SumUp payment is already recorded against another order
    if (error?.code === '23505') {
      return { ok: false, reason: 'That SumUp payment has already been used for another order' };
    }
    throw error;
  }
}
