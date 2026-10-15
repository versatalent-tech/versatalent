/** Talking to the pretend SumUp (e2e/mocks/sumup.mjs) */
import { SUMUP_MOCK } from './env';

export interface MockCheckout {
  id: string;
  status: string;
  amount: number;
  currency: string;
  checkout_reference: string;
}

export async function checkouts(): Promise<MockCheckout[]> {
  return (await fetch(`${SUMUP_MOCK}/__checkouts`)).json();
}

/** The checkouts created for one ticket order, oldest first */
export async function checkoutsForOrder(orderId: string): Promise<MockCheckout[]> {
  return (await checkouts()).filter((c) => c.checkout_reference.includes(orderId));
}

/** Settle a checkout without a browser (as if the buyer paid and closed the tab) */
export async function settle(checkoutId: string, result: 'paid' | 'failed' | 'expired') {
  const response = await fetch(`${SUMUP_MOCK}/pay/${checkoutId}?result=${result}&redirect=0`);
  if (!response.ok) throw new Error(`Mock SumUp: ${response.status}`);
}
