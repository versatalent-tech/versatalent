# Stripe Payment Integration Guide

## Overview

This guide walks you through integrating Stripe payment processing with the VersaTalent POS system.

## Prerequisites

- ✅ Migration 008 completed (POS tables created)
- ✅ POS system running and accessible
- ✅ Stripe account (create at https://stripe.com)

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Sign up"
3. Complete registration
4. Verify email address
5. Complete business information

## Step 2: Get API Keys

### Test Mode Keys (Development)

1. Login to Stripe Dashboard: https://dashboard.stripe.com
2. Click "Developers" in left sidebar
3. Click "API keys"
4. You'll see two test keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
5. Click "Reveal test key" for the secret key
6. Copy both keys

### Live Mode Keys (Production)

**⚠️ Only use live keys when ready for production!**

1. Toggle "Test mode" to OFF (top right)
2. Same process as test keys
3. Live keys start with `pk_live_` and `sk_live_`

## Step 3: Configure Environment Variables

Add Stripe keys to your `.env` file:

```bash
# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxx
```

**Important Security Notes:**
- ✅ Never commit `.env` to git
- ✅ Add `.env` to `.gitignore`
- ✅ Use different keys for development and production
- ❌ Never expose secret keys in client-side code

## Step 4: Install Stripe SDK

```bash
cd versatalent
bun add stripe @stripe/stripe-js @stripe/react-stripe-js
```

This installs:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe.js
- `@stripe/react-stripe-js` - React components for Stripe

## Step 5: Enable Payment Intent API

Update the payment intent route to use real Stripe:

### Edit: `src/app/api/pos/create-payment-intent/route.ts`

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/repositories/pos-orders';
import Stripe from 'stripe';
import { withPOSAuth } from '@/lib/auth/pos-auth';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export const POST = withPOSAuth(async (request: NextRequest) => {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch the order
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not pending' },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_cents,
      currency: order.currency.toLowerCase(),
      metadata: {
        order_id: order.id,
        customer_user_id: order.customer_user_id || 'guest'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent', details: error.message },
      { status: 500 }
    );
  }
});
```

## Step 6: Update POS Page for Stripe Checkout

### Edit: `src/app/pos/page.tsx`

Add Stripe Elements at the top:

```typescript
"use client";

import { useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
// ... other imports

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
```

Create a checkout component:

```typescript
function CheckoutForm({ orderId, onSuccess, onError }: {
  orderId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pos`,
        },
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        // Payment successful - update order status
        const response = await fetch(`/api/pos/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' })
        });

        if (response.ok) {
          onSuccess();
        } else {
          throw new Error('Failed to update order');
        }
      }
    } catch (err: any) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-gold hover:bg-gold/90"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}
```

Update the checkout handler:

```typescript
const handleCheckout = async () => {
  if (cart.length === 0) {
    setError('Cart is empty');
    return;
  }

  setProcessingPayment(true);
  setError(null);

  try {
    // Create order
    const orderResponse = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_user_id: customer?.id || null,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      })
    });

    if (!orderResponse.ok) {
      throw new Error('Failed to create order');
    }

    const order = await orderResponse.json();

    // Create payment intent
    const intentResponse = await fetch('/api/pos/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id })
    });

    if (!intentResponse.ok) {
      throw new Error('Failed to create payment intent');
    }

    const { clientSecret } = await intentResponse.json();

    // Show Stripe checkout
    setClientSecret(clientSecret);
    setCurrentOrderId(order.id);
    setShowPaymentDialog(true);

  } catch (err: any) {
    console.error('Checkout error:', err);
    setError(err.message || 'Payment failed. Please try again.');
    setProcessingPayment(false);
  }
};
```

## Step 7: Test Stripe Integration

### Test Card Numbers

Stripe provides test cards for development:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |

**Test Details:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### Testing Flow

1. Start dev server: `bun run dev`
2. Go to http://localhost:3000/pos
3. Add products to cart
4. Click "Checkout"
5. Enter test card: `4242 4242 4242 4242`
6. Complete payment
7. Verify order status changes to "paid"
8. Check Stripe Dashboard for payment

## Step 8: Enable Webhooks (Recommended)

Webhooks notify your app when payments succeed/fail:

### Setup Stripe CLI (for local development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Create Webhook Endpoint

Create: `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateOrderStatus } from '@/lib/db/repositories/pos-orders';
import { processPOSOrderForVIP } from '@/lib/services/pos-vip-integration';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle payment success
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      // Update order status
      const order = await updateOrderStatus(orderId, 'paid', paymentIntent.id);

      // Award VIP points if applicable
      if (order && order.customer_user_id) {
        await processPOSOrderForVIP(order);
      }
    }
  }

  // Handle payment failure
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await updateOrderStatus(orderId, 'failed', paymentIntent.id);
    }
  }

  return NextResponse.json({ received: true });
}
```

### Add Webhook Secret to .env

```bash
# Get webhook secret from Stripe CLI or Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

## Step 9: Go Live

When ready for production:

1. **Switch to Live Keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
   ```

2. **Configure Production Webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret to `.env`

3. **Test in Production:**
   - Use real card (your own)
   - Verify payment appears in Stripe Dashboard
   - Check order status updates correctly
   - Confirm VIP points awarded

4. **Enable Additional Features:**
   - Receipts via email
   - Refunds
   - Disputes management
   - Fraud detection

## Security Checklist

Before going live:

- [ ] All Stripe keys in `.env` (not hardcoded)
- [ ] `.env` in `.gitignore`
- [ ] Different keys for dev/prod
- [ ] Webhook signature verification enabled
- [ ] HTTPS enabled in production
- [ ] Auth middleware on all POS routes
- [ ] Input validation on all endpoints
- [ ] Rate limiting on checkout
- [ ] Error handling doesn't expose secrets

## Troubleshooting

### "Invalid API Key"

- Check key is correct in `.env`
- Ensure no extra spaces
- Restart dev server after changing `.env`
- Verify using correct environment (test vs live)

### "Authentication Required"

- Check `withPOSAuth` is applied to route
- Verify admin session is valid
- Clear cookies and login again

### Payment Intent Fails

- Check Stripe Dashboard logs
- Verify amount is >= €0.50 (minimum)
- Ensure currency is supported
- Check card number is valid

### Webhook Not Triggering

- Verify webhook URL is correct
- Check webhook secret matches
- Test with Stripe CLI first
- Verify endpoint returns 200 OK

## Additional Resources

- **Stripe Docs**: https://stripe.com/docs
- **Testing**: https://stripe.com/docs/testing
- **Webhooks**: https://stripe.com/docs/webhooks
- **Dashboard**: https://dashboard.stripe.com

---

**Next Steps:**
1. Get Stripe API keys
2. Add to `.env`
3. Install Stripe packages
4. Update payment intent API
5. Test with test cards
6. Set up webhooks
7. Go live! 🚀
