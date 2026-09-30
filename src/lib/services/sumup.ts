/**
 * SumUp API client (server only)
 *
 * Card payments on the POS go through SumUp:
 * - Solo card reader via the Cloud API: we send a checkout to the reader and
 *   SumUp calls our webhook with the result
 * - SumUp app (e.g. Tap to Pay on iPhone): staff enter the transaction code,
 *   which we look up here
 *
 * A payment is only trusted after fetching the transaction from SumUp and
 * checking its status, amount and currency (webhooks aren't signed).
 *
 * Environment:
 *   SUMUP_API_KEY           Secret API key (me.sumup.com > Developers > API keys)
 *   SUMUP_MERCHANT_CODE     Merchant code, e.g. MC0X0ABC
 *   SUMUP_AFFILIATE_KEY     Affiliate key (me.sumup.com > Developers)
 *   SUMUP_AFFILIATE_APP_ID  App ID the affiliate key was created for
 */

const SUMUP_API = 'https://api.sumup.com';

interface SumUpConfig {
  apiKey: string;
  merchantCode: string;
  affiliateKey: string;
  affiliateAppId: string;
}

export class SumUpNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`SumUp is not configured (missing ${missing.join(', ')})`);
    this.name = 'SumUpNotConfiguredError';
  }
}

export class SumUpApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'SumUpApiError';
  }
}

/**
 * Read a setting, ignoring stray whitespace or quotes that often come along
 * when pasting keys into Netlify.
 */
function readSetting(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, '').trim();
  return cleaned || undefined;
}

function getConfig(): SumUpConfig {
  const values = {
    SUMUP_API_KEY: readSetting('SUMUP_API_KEY'),
    SUMUP_MERCHANT_CODE: readSetting('SUMUP_MERCHANT_CODE'),
    SUMUP_AFFILIATE_KEY: readSetting('SUMUP_AFFILIATE_KEY'),
    SUMUP_AFFILIATE_APP_ID: readSetting('SUMUP_AFFILIATE_APP_ID'),
  };
  const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    throw new SumUpNotConfiguredError(missing);
  }
  return {
    apiKey: values.SUMUP_API_KEY!,
    merchantCode: values.SUMUP_MERCHANT_CODE!,
    affiliateKey: values.SUMUP_AFFILIATE_KEY!,
    affiliateAppId: values.SUMUP_AFFILIATE_APP_ID!,
  };
}

/** Which settings are present, for the admin setup page (never the values) */
export function getSumUpConfigStatus() {
  return {
    apiKey: !!readSetting('SUMUP_API_KEY'),
    merchantCode: !!readSetting('SUMUP_MERCHANT_CODE'),
    affiliateKey: !!readSetting('SUMUP_AFFILIATE_KEY'),
    affiliateAppId: !!readSetting('SUMUP_AFFILIATE_APP_ID'),
  };
}

/**
 * Hints for fixing the settings, for the admin setup page. Only reveals the
 * key's type prefix, never the key itself.
 */
export function getSumUpConfigHints(): string[] {
  const hints: string[] = [];
  const rawKey = process.env.SUMUP_API_KEY;
  const key = readSetting('SUMUP_API_KEY');

  if (rawKey && key && rawKey !== key) {
    hints.push('SUMUP_API_KEY had spaces or quotes around it. They are ignored, but it is worth removing them in Netlify.');
  }
  if (key) {
    if (key.startsWith('sup_pk_')) {
      hints.push('SUMUP_API_KEY is a public key (starts with sup_pk_). Use the secret key, which starts with sup_sk_.');
    } else if (!key.startsWith('sup_sk_')) {
      hints.push('SUMUP_API_KEY does not look like a SumUp secret key (these start with sup_sk_). Check you copied the right value.');
    }
  }
  const merchantCode = readSetting('SUMUP_MERCHANT_CODE');
  if (merchantCode && !/^[A-Z0-9]{6,12}$/.test(merchantCode)) {
    hints.push('SUMUP_MERCHANT_CODE should be a short code of capital letters and numbers, e.g. MC0X0ABC.');
  }
  return hints;
}

async function sumupRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getConfig();
  const response = await fetch(`${SUMUP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.detail || body?.message || body?.errors?.detail || `SumUp API error ${response.status}`;
    throw new SumUpApiError(response.status, message);
  }
  return body as T;
}

const merchantPath = () => `/v0.1/merchants/${encodeURIComponent(getConfig().merchantCode)}`;

// ---------------------------------------------------------------------------
// Readers (Solo) - Cloud API
// ---------------------------------------------------------------------------

export interface SumUpReader {
  id: string;
  name: string;
  status: 'unknown' | 'processing' | 'paired' | 'expired';
  device: { identifier: string; model: 'solo' | 'virtual-solo' };
  created_at: string;
  updated_at: string;
}

export async function listReaders(): Promise<SumUpReader[]> {
  const body = await sumupRequest<{ items: SumUpReader[] }>(`${merchantPath()}/readers`);
  return body.items || [];
}

/** Pair a Solo using the code shown on it (Connections > API > Connect) */
export async function pairReader(pairingCode: string, name: string): Promise<SumUpReader> {
  return sumupRequest<SumUpReader>(`${merchantPath()}/readers`, {
    method: 'POST',
    body: JSON.stringify({ pairing_code: pairingCode, name }),
  });
}

export async function unpairReader(readerId: string): Promise<void> {
  await sumupRequest<unknown>(`${merchantPath()}/readers/${encodeURIComponent(readerId)}`, { method: 'DELETE' });
}

/**
 * Send a payment to a reader. Returns SumUp's client_transaction_id, used to
 * match the webhook and to look the transaction up.
 */
export async function createReaderCheckout(params: {
  readerId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
}): Promise<{ clientTransactionId: string }> {
  const { affiliateKey, affiliateAppId } = getConfig();
  const body = await sumupRequest<{ data: { client_transaction_id: string; checkout_id?: string } }>(
    `${merchantPath()}/readers/${encodeURIComponent(params.readerId)}/checkout`,
    {
      method: 'POST',
      body: JSON.stringify({
        total_amount: {
          value: params.amountCents,
          currency: params.currency,
          minor_unit: 2,
        },
        description: params.description,
        return_url: params.returnUrl,
        affiliate: {
          key: affiliateKey,
          app_id: affiliateAppId,
          // Links the SumUp transaction back to our order
          foreign_transaction_id: params.orderId,
        },
      }),
    }
  );
  return { clientTransactionId: body.data.client_transaction_id };
}

/** Cancel the payment waiting on a reader (only while it awaits the card/PIN) */
export async function terminateReaderCheckout(readerId: string): Promise<void> {
  await sumupRequest<unknown>(`${merchantPath()}/readers/${encodeURIComponent(readerId)}/terminate`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface SumUpTransaction {
  id: string;
  transaction_code: string;
  amount: number;
  currency: string;
  status: string;
  simple_status?: string;
  client_transaction_id?: string;
  foreign_transaction_id?: string;
  timestamp: string;
}

/** Look up one transaction; returns null if SumUp doesn't know it (yet) */
export async function getTransaction(
  lookup: { client_transaction_id: string } | { transaction_code: string }
): Promise<SumUpTransaction | null> {
  const { merchantCode } = getConfig();
  const query = new URLSearchParams(lookup as Record<string, string>).toString();
  try {
    return await sumupRequest<SumUpTransaction>(
      `/v2.1/merchants/${encodeURIComponent(merchantCode)}/transactions?${query}`
    );
  } catch (error) {
    if (error instanceof SumUpApiError && error.status === 404) return null;
    throw error;
  }
}

export interface TransactionCheck {
  ok: boolean;
  /** Not finished yet: check again later */
  pending?: boolean;
  /** Why it doesn't pay for the order (when ok is false) */
  reason?: string;
}

/**
 * Whether a SumUp transaction pays for an order: successful, same currency,
 * and the exact amount.
 */
export function checkTransactionPaysOrder(
  transaction: SumUpTransaction,
  order: { total_cents: number; currency: string }
): TransactionCheck {
  const status = (transaction.simple_status || transaction.status || '').toUpperCase();
  if (status === 'PENDING') {
    return { ok: false, pending: true, reason: 'Payment is still in progress' };
  }
  if (status !== 'SUCCESSFUL' && status !== 'PAID_OUT') {
    return { ok: false, reason: `Payment was not successful (${status.toLowerCase() || 'unknown'})` };
  }
  if (transaction.currency?.toUpperCase() !== order.currency.toUpperCase()) {
    return { ok: false, reason: `Currency mismatch (${transaction.currency} vs ${order.currency})` };
  }
  if (Math.round(transaction.amount * 100) !== order.total_cents) {
    return {
      ok: false,
      reason: `Amount mismatch (paid ${transaction.amount.toFixed(2)}, order is ${(order.total_cents / 100).toFixed(2)})`,
    };
  }
  return { ok: true };
}
