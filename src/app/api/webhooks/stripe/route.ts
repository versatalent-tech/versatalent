import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { updateOrderStatus } from '@/lib/db/repositories/pos-orders';
import { processPOSOrderForVIP } from '@/lib/services/pos-vip-integration';

// Lazy initialize Stripe (only when needed)
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  });
}

// Get webhook secret
function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

/**
 * Stripe Webhook Handler
 * Handles payment_intent.succeeded and payment_intent.payment_failed events
 *
 * This ensures payments are processed even if user closes browser
 * before payment completes
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No stripe-signature header found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Get Stripe instance and webhook secret
    let stripe: Stripe;
    let webhookSecret: string;

    try {
      stripe = getStripe();
      webhookSecret = getWebhookSecret();
    } catch (err: any) {
      console.error('Stripe configuration error:', err.message);
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Log event for monitoring
    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);

  // Get order ID from metadata
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    console.error('[Webhook] No order_id in payment intent metadata');
    return;
  }

  try {
    // Update order status to paid
    const order = await updateOrderStatus(orderId, 'paid', paymentIntent.id);

    if (!order) {
      console.error(`[Webhook] Order not found: ${orderId}`);
      return;
    }

    console.log(`[Webhook] Order ${orderId} marked as paid`);

    // Award VIP points if customer is linked
    if (order.customer_user_id) {
      const vipResult = await processPOSOrderForVIP(order);

      if (vipResult.success) {
        console.log(
          `[Webhook] VIP points awarded to ${order.customer_user_id}: ${vipResult.pointsAwarded} points`
        );
      } else {
        console.error(
          `[Webhook] Failed to award VIP points: ${vipResult.error}`
        );
      }
    }

    // TODO: Send receipt email
    // TODO: Trigger inventory update
    // TODO: Notify staff dashboard

  } catch (error: any) {
    console.error('[Webhook] Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);

  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    console.error('[Webhook] No order_id in payment intent metadata');
    return;
  }

  try {
    // Update order status to failed
    await updateOrderStatus(orderId, 'failed', paymentIntent.id);

    console.log(`[Webhook] Order ${orderId} marked as failed`);

    // Get failure reason
    const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
    console.log(`[Webhook] Failure reason: ${failureMessage}`);

    // TODO: Notify customer
    // TODO: Notify staff
    // TODO: Log for review

  } catch (error: any) {
    console.error('[Webhook] Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment canceled: ${paymentIntent.id}`);

  const orderId = paymentIntent.metadata.order_id;

  if (orderId) {
    try {
      await updateOrderStatus(orderId, 'cancelled', paymentIntent.id);
      console.log(`[Webhook] Order ${orderId} marked as cancelled`);
    } catch (error: any) {
      console.error('[Webhook] Error handling payment cancellation:', error);
    }
  }
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  console.log(`[Webhook] Charge refunded: ${charge.id}`);

  // Get payment intent ID
  const paymentIntentId = charge.payment_intent as string;

  if (paymentIntentId) {
    // TODO: Find order by payment intent ID
    // TODO: Update order status
    // TODO: Reverse VIP points
    // TODO: Notify customer

    console.log(`[Webhook] Refund processed for payment intent: ${paymentIntentId}`);
  }
}
