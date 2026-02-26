"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, CheckCircle2, X } from "lucide-react";

// Initialize Stripe only if publishable key exists
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface StripeCheckoutProps {
  orderId: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string, orderResult?: any) => void;
  onCancel: () => void;
}

function CheckoutForm({ orderId, amount, onSuccess, onCancel }: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is not loaded. Please refresh the page.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/pos`,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update order status in database
        const response = await fetch(`/api/pos/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'paid',
            stripe_payment_intent_id: paymentIntent.id
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update order status');
        }

        const result = await response.json();

        // Success!
        onSuccess(paymentIntent.id, result);

        // Show VIP points if awarded
        if (result.vip?.pointsAwarded) {
          console.log(`VIP points awarded: ${result.vip.pointsAwarded}`);
        }
      } else {
        throw new Error('Payment incomplete. Please try again.');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Element */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <PaymentElement />
      </div>

      {/* Amount Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Total Amount:</span>
          <span className="text-xl font-bold text-blue-900">
            €{(amount / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-gold hover:bg-gold/90 text-white"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay €{(amount / 100).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function StripeCheckout({
  orderId,
  amount,
  currency,
  onSuccess,
  onCancel
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment intent client secret
  useEffect(() => {
    // Check if Stripe is configured
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setError('Stripe is not configured. Please add your Stripe API keys to the .env file. See STRIPE_ENV_SETUP.md for instructions.');
      setLoading(false);
      return;
    }

    const fetchClientSecret = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/pos/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [orderId]);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#D4AF37',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gold" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Enter your payment details to complete the order
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              <span className="ml-3 text-gray-600">Loading payment form...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                onClick={onCancel}
                variant="outline"
                className="mt-3 w-full"
              >
                Close
              </Button>
            </div>
          )}

          {!loading && !error && clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance,
              }}
            >
              <CheckoutForm
                orderId={orderId}
                amount={amount}
                onSuccess={onSuccess}
                onCancel={onCancel}
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
