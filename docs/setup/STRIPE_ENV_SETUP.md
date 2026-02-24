# Quick Stripe Setup - Add API Keys

## ✅ Step 1: Stripe Packages Installed

The following packages are now installed:
- ✅ `stripe` - Server-side Stripe SDK
- ✅ `@stripe/stripe-js` - Client-side Stripe.js
- ✅ `@stripe/react-stripe-js` - React components

## 🔑 Step 2: Get Your Stripe API Keys

### Option A: Use Test Mode (Recommended for Development)

1. **Go to Stripe Dashboard:**
   - Open: https://dashboard.stripe.com/test/apikeys
   - Login or create account if needed

2. **Copy Your Test Keys:**
   - **Publishable key**: Click to copy (starts with `pk_test_`)
   - **Secret key**: Click "Reveal test key token", then copy (starts with `sk_test_`)

3. **Save Both Keys** - you'll need them in the next step!

### Option B: Use Live Mode (Production Only!)

**⚠️ WARNING: Only use live keys when ready for production!**

1. Toggle "Test mode" to OFF (top right of dashboard)
2. Get your live keys (start with `pk_live_` and `sk_live_`)

## 📝 Step 3: Add Keys to Your .env File

### Create/Edit `.env` File

In your `versatalent` directory, create or edit the `.env` file:

```bash
cd versatalent
```

If `.env` doesn't exist, create it:
```bash
touch .env
```

### Add These Lines:

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_FROM_STRIPE_DASHBOARD
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_FROM_STRIPE_DASHBOARD

# For client-side Stripe.js (same as publishable key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_FROM_STRIPE_DASHBOARD
```

**Replace the `xxx...` with your actual keys from Stripe Dashboard!**

### Important Security Notes:

- ✅ `.env` is already in `.gitignore` (safe)
- ✅ Never commit API keys to git
- ✅ Use test keys for development
- ✅ Use live keys only in production
- ❌ Never share your secret key publicly

## 🧪 Step 4: Test the Integration

### 1. Restart Your Dev Server

**Important:** You must restart after changing `.env`

```bash
# Stop server (Ctrl+C)
# Then restart:
bun run dev
```

### 2. Check Stripe is Working

Open your browser console and check for errors:

```bash
# Open dev server
http://localhost:3000/pos
```

### 3. Test with Stripe Test Cards

Use these test card numbers:

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| `4242 4242 4242 4242` | Success | Payment succeeds |
| `4000 0000 0000 0002` | Decline | Card declined |
| `4000 0000 0000 9995` | Insufficient | Insufficient funds |
| `4000 0025 0000 3155` | 3D Secure | Requires authentication |

**For all test cards:**
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### 4. Process a Test Transaction

1. **Open POS**: http://localhost:3000/pos
2. **Login as admin** (if not already)
3. **Add products to cart:**
   - Click on "Espresso" (€2.50)
   - Click on "Cappuccino" (€3.50)
   - Total: €6.00
4. **Click "Checkout"**
5. **Stripe payment form appears**
6. **Enter test card**: `4242 4242 4242 4242`
7. **Enter expiry**: `12/25`
8. **Enter CVC**: `123`
9. **Click "Pay €6.00"**
10. **Success!** ✅

### Expected Result:

```
✅ Payment successful! Order #abc12345
```

## 🔍 Troubleshooting

### Error: "Stripe authentication failed"

**Problem:** Secret key is wrong or missing

**Solution:**
1. Check `.env` has `STRIPE_SECRET_KEY=sk_test_...`
2. Verify key is correct (copy again from dashboard)
3. Restart dev server
4. Check for extra spaces in `.env`

### Error: "Stripe is not loaded"

**Problem:** Publishable key missing or wrong

**Solution:**
1. Check `.env` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
2. Verify key is correct
3. Restart dev server
4. Clear browser cache

### Error: "Order total must be at least €0.50"

**Problem:** Stripe has a minimum charge of 50 cents

**Solution:**
- Add more items to cart to reach €0.50 minimum
- Or adjust product prices

### Payment Form Not Showing

**Problem:** JavaScript error or missing keys

**Solution:**
1. Open browser console (F12)
2. Look for errors
3. Check all 3 env vars are set:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Restart dev server

## ✅ Verification Checklist

Before going live, verify:

- [ ] `.env` file created
- [ ] `STRIPE_SECRET_KEY` added (starts with `sk_test_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` added (starts with `pk_test_`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` added (same as above)
- [ ] Dev server restarted
- [ ] Test transaction successful with `4242 4242 4242 4242`
- [ ] Payment appears in Stripe Dashboard
- [ ] VIP points awarded (if customer linked)
- [ ] Order status changes to "paid"

## 🎯 Next Steps

Once test mode is working:

1. **View Payments in Stripe:**
   - Go to: https://dashboard.stripe.com/test/payments
   - See all your test transactions

2. **Test VIP Points:**
   - Link a customer via NFC
   - Complete checkout
   - Verify points awarded

3. **Test Different Cards:**
   - Declined card: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

4. **Prepare for Production:**
   - Get live API keys
   - Update `.env` with live keys
   - Test with real card (small amount)
   - Enable webhooks
   - Go live! 🚀

## 📞 Need Help?

**Stripe Documentation:**
- Testing: https://stripe.com/docs/testing
- Payment Intents: https://stripe.com/docs/payments/payment-intents
- API Keys: https://stripe.com/docs/keys

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com/support
- Email: support@stripe.com

**VersaTalent POS:**
- Full Guide: `STRIPE_SETUP_GUIDE.md`
- NFC Setup: `NFC_HARDWARE_SETUP.md`

---

**Your Stripe integration is ready! Add your API keys and start testing! 🎉**
