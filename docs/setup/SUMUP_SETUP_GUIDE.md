# SumUp Card Payments Setup

All card payments on the till (`/staff/pos`) go through SumUp. Staff choose one of three ways to take payment:

| Option | How it works |
|---|---|
| **Card reader** | The till sends the total to a paired SumUp Solo reader. The customer taps, inserts or swipes; SumUp reports the result and the sale completes on its own. |
| **SumUp app** | Staff take the payment in the SumUp app (e.g. Tap to Pay on iPhone), then type the transaction code shown in the app. The site looks the transaction up with SumUp before completing the sale. |
| **Cash** | Staff confirm the cash was taken. |

Whichever option is used, the order is marked paid once, stock is reduced, and a linked VIP member gets their points once.

## 1. Create the SumUp keys

In the SumUp dashboard (me.sumup.com → Developers):

1. Create a **secret API key**.
2. Note your **merchant code** (e.g. `MC0X0ABC`).
3. Create an **affiliate key** for your app and note the **app ID** it was created for (needed for the Solo reader).

## 2. Add them to Netlify

Netlify → Site configuration → Environment variables:

| Variable | Value |
|---|---|
| `SUMUP_API_KEY` | Secret API key |
| `SUMUP_MERCHANT_CODE` | Merchant code |
| `SUMUP_AFFILIATE_KEY` | Affiliate key |
| `SUMUP_AFFILIATE_APP_ID` | Affiliate app ID |

Redeploy the site afterwards. Then open **Admin → Card Payments (SumUp)**: each setting shows a tick when present, and the page confirms "Connected to SumUp" once SumUp accepts the keys. The keys themselves are never shown.

## 3. Pair a Solo reader

On **Admin → Card Payments (SumUp)**:

1. On the Solo, log out of SumUp and connect it to Wi-Fi.
2. On the reader, open the top menu → Connections → API → Connect. It shows a pairing code (valid for 5 minutes).
3. Enter the code and a name (e.g. "Bar Solo") and click **Pair reader**.

Paired readers appear in the list and can be chosen on the till. To unpair one, remove it there and also disconnect it on the reader (Connections → API → Disconnect).

## 4. Database

Run `migrations/022_sumup_payments.sql` once (after `021_pos_currency_gbp.sql`). It records how each order was paid (`payment_method`) and the SumUp transaction, and stops one SumUp payment being used for two orders.

Orders paid before the switch to SumUp keep `payment_method = 'stripe'` and show as "Card (Stripe, before SumUp)".

## How payments are verified

- **Reader payments:** SumUp calls `/api/webhooks/sumup` when the payment finishes, and the till also checks `/api/pos/sumup/status` while it waits, so a slow webhook doesn't hold up the sale.
- **App payments:** the transaction code is accepted only if SumUp reports it succeeded, for the exact amount and currency, after the sale was opened, and it hasn't been used for another order.
- SumUp's webhook isn't signed, so it is only used to find the order; the payment is always confirmed by fetching the transaction from SumUp.

## Where to see payments

- **Admin → POS Orders** (`/admin/pos/orders`): each order shows how it was paid and the SumUp transaction code.
- **Admin → NFC → Users → View purchase history**: a member's paid orders, with the same details.
- The SumUp dashboard: search a transaction by its code.

## Troubleshooting

- **"missing" next to a setting:** the variable isn't set in Netlify, or the site wasn't redeployed after adding it.
- **SumUp rejects the keys:** the admin page shows SumUp's reason; check the key, merchant code and that the affiliate key belongs to the app ID.
- **Reader not listed on the till:** pair it on the admin page; it must be online.
- **App payment not accepted:** check the code was typed exactly, the amount matches the sale, and the payment was taken after the sale was opened.
