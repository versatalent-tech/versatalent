import Stripe from 'stripe';
import type { User } from '@/lib/db/types';

/**
 * Initialize Stripe client with API key from environment
 * @returns Stripe instance
 * @throws Error if STRIPE_SECRET_KEY is not set
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Add it to your environment variables.'
    );
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
}

/**
 * Create a Stripe customer for a VersaTalent user
 * @param user - The user to create a Stripe customer for
 * @returns Stripe customer object with customer ID
 */
export async function createStripeCustomer(
  user: User
): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeClient();

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        versatalent_user_id: user.id,
        versatalent_role: user.role,
        created_via: 'versatalent_registration',
      },
      description: `VersaTalent ${user.role} - ${user.name}`,
    });

    console.log(`Created Stripe customer ${customer.id} for user ${user.id}`);
    return customer;
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
}

/**
 * Retrieve an existing Stripe customer by ID
 * @param customerId - Stripe customer ID (cus_xxx)
 * @returns Stripe customer object
 */
export async function getStripeCustomer(
  customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error: any) {
    console.error('Error retrieving Stripe customer:', error);
    throw new Error(`Failed to retrieve Stripe customer: ${error.message}`);
  }
}

/**
 * Update an existing Stripe customer
 * @param customerId - Stripe customer ID
 * @param updates - Fields to update
 * @returns Updated Stripe customer
 */
export async function updateStripeCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.update(customerId, updates);
    console.log(`Updated Stripe customer ${customerId}`);
    return customer;
  } catch (error: any) {
    console.error('Error updating Stripe customer:', error);
    throw new Error(`Failed to update Stripe customer: ${error.message}`);
  }
}

/**
 * Create or retrieve a Stripe customer for a user
 * This is a helper that checks if the user already has a Stripe customer
 * If not, it creates one
 *
 * @param user - The user to get/create a Stripe customer for
 * @param existingCustomerId - Optional existing Stripe customer ID
 * @returns Stripe customer ID
 */
export async function ensureStripeCustomer(
  user: User,
  existingCustomerId?: string | null
): Promise<string> {
  try {
    // If we already have a customer ID, verify it exists and return it
    if (existingCustomerId) {
      try {
        const customer = await getStripeCustomer(existingCustomerId);
        if (customer && !customer.deleted) {
          return existingCustomerId;
        }
      } catch (error) {
        console.warn(
          `Existing Stripe customer ${existingCustomerId} not found, creating new one`
        );
      }
    }

    // Create a new customer
    const customer = await createStripeCustomer(user);
    return customer.id;
  } catch (error: any) {
    console.error('Error ensuring Stripe customer:', error);
    throw new Error(`Failed to ensure Stripe customer: ${error.message}`);
  }
}

/**
 * List payment methods for a Stripe customer
 * @param customerId - Stripe customer ID
 * @returns List of payment methods
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  try {
    const stripe = getStripeClient();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  } catch (error: any) {
    console.error('Error listing payment methods:', error);
    throw new Error(`Failed to list payment methods: ${error.message}`);
  }
}

/**
 * Get total amount spent by a customer in Stripe
 * @param customerId - Stripe customer ID
 * @returns Total amount in cents
 */
export async function getCustomerTotalSpent(
  customerId: string
): Promise<number> {
  try {
    const stripe = getStripeClient();

    // Get all successful charges for this customer
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100, // Adjust if needed
    });

    const totalCents = charges.data
      .filter(charge => charge.status === 'succeeded' && !charge.refunded)
      .reduce((sum, charge) => sum + charge.amount, 0);

    return totalCents;
  } catch (error: any) {
    console.error('Error calculating customer total spent:', error);
    throw new Error(`Failed to calculate total spent: ${error.message}`);
  }
}
