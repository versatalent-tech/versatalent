import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/repositories/pos-orders';
import { getUserById, updateUser } from '@/lib/db/repositories/users';
import { withPOSAuth } from '@/lib/auth/pos-auth';
import { ensureStripeCustomer } from '@/lib/services/stripe';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your .env file.');
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
};

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

    // Validate amount (Stripe minimum is 50 cents)
    if (order.total_cents < 50) {
      return NextResponse.json(
        { error: 'Order total must be at least €0.50' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    const stripe = getStripe();

    // Get Stripe customer ID if this order has a customer
    let stripeCustomerId: string | undefined;

    if (order.customer_user_id) {
      try {
        // Get the customer user
        const customer = await getUserById(order.customer_user_id);

        if (customer) {
          // Ensure customer has a Stripe customer ID
          stripeCustomerId = await ensureStripeCustomer(
            customer,
            customer.stripe_customer_id
          );

          // Update the user record if we created a new Stripe customer
          if (!customer.stripe_customer_id && stripeCustomerId) {
            await updateUser(customer.id, {
              stripe_customer_id: stripeCustomerId,
            });
            console.log(`Linked Stripe customer ${stripeCustomerId} to user ${customer.id}`);
          }
        }
      } catch (error) {
        console.error('Error getting/creating Stripe customer:', error);
        // Continue without customer ID - payment will still work
      }
    }

    // Create Payment Intent with optional customer
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: order.total_cents,
      currency: order.currency.toLowerCase(),
      metadata: {
        order_id: order.id,
        customer_user_id: order.customer_user_id || 'guest',
        staff_user_id: order.staff_user_id || 'unknown',
        stripe_customer_id: stripeCustomerId || 'none',
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `POS Order #${order.id.slice(0, 8)}`,
    };

    // Attach customer to payment intent if available
    if (stripeCustomerId) {
      paymentIntentParams.customer = stripeCustomerId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.total_cents,
      currency: order.currency,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: 'Stripe authentication failed. Check your API key.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent', details: error.message },
      { status: 500 }
    );
  }
});
