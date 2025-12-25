# Stripe Webhooks Setup Guide

## 📡 What Are Webhooks?

Webhooks are automated messages sent from Stripe to your server when events happen.

**Why You Need Them:**
- ✅ Payments processed even if user closes browser
- ✅ Handle async payment methods (bank transfers)
- ✅ Receive refund notifications
- ✅ Get dispute alerts
- ✅ Production reliability

**Without Webhooks:**
- ❌ Orders might stay "pending" after successful payment
- ❌ VIP points might not be awarded
- ❌ No notification of refunds
- ❌ Can't handle async payments

---

## 🛠️ Local Development Setup

### Option 1: Stripe CLI (Recommended)

**Install Stripe CLI:**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop install stripe

# Linux
# Download from: https://github.com/stripe/stripe-cli/releases
```

**Login to Stripe:**

```bash
stripe login
```

**Forward Webhooks to Local Server:**

```bash
# Start your dev server first
bun run dev

# In a new terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Add to .env:**

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Test It:**

```bash
# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

**Expected:**
- Webhook received by your app
- Order marked as paid
- VIP points awarded
- Logs show: `[Webhook] Payment succeeded`

### Option 2: Ngrok (Alternative)

If Stripe CLI doesn't work:

**Install Ngrok:**
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

**Expose Local Server:**
```bash
ngrok http 3000
```

**Output:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Configure Webhook:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://abc123.ngrok.io/api/webhooks/stripe`
3. Select events (see below)
4. Copy webhook secret to `.env`

---

## 🌐 Production Setup

### Step 1: Deploy Your Application

Deploy to production with your webhook endpoint:
```
https://yourdomain.com/api/webhooks/stripe
```

### Step 2: Create Webhook Endpoint

1. **Go to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/webhooks
   ```
   (Make sure you're in LIVE mode!)

2. **Click "Add endpoint"**

3. **Enter Endpoint URL:**
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```

4. **Description:** (optional)
   ```
   VersaTalent POS Webhook Handler
   ```

5. **Version:** Latest (default)

### Step 3: Select Events

**Required Events:**
- ✅ `payment_intent.succeeded` - Payment successful
- ✅ `payment_intent.payment_failed` - Payment failed

**Recommended Events:**
- ✅ `payment_intent.canceled` - Payment canceled
- ✅ `charge.refunded` - Refund processed

**Optional Events:**
- `charge.dispute.created` - Dispute filed
- `charge.dispute.closed` - Dispute resolved
- `customer.created` - Customer created
- `payment_method.attached` - Card saved

**Click "Add events"** → Select all required events

### Step 4: Save and Get Secret

1. **Click "Add endpoint"**

2. **Copy Signing Secret:**
   - Shown after creation
   - Starts with `whsec_`
   - Example: `whsec_a1b2c3d4e5f6g7h8i9j0`

3. **Add to Production Environment:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
   ```

4. **Redeploy** application with new env var

---

## 🧪 Testing Webhooks

### Test 1: Verify Endpoint is Live

**Using curl:**

```bash
curl -X POST https://yourdomain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected Response:**
```json
{"error": "No signature provided"}
```

This is good! It means the endpoint exists.

### Test 2: Send Test Webhook from Stripe

1. **Go to your webhook endpoint** in Stripe Dashboard

2. **Click "Send test webhook"**

3. **Select event:** `payment_intent.succeeded`

4. **Click "Send test webhook"**

5. **Check Response:**
   - Status: `200 OK`
   - Body: `{"received": true}`

6. **View Logs:**
   - Click "View logs" in Stripe Dashboard
   - See request/response details
   - Check for errors

### Test 3: Real Payment Test

1. **Make test payment** in your POS

2. **Complete payment successfully**

3. **Check Webhook Logs:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click your endpoint
   - See "Recent deliveries"
   - Should show `payment_intent.succeeded`

4. **Verify in App:**
   - Order marked as paid
   - VIP points awarded (if customer linked)
   - Check application logs

### Test 4: Failed Payment

1. **Use declined test card:** `4000 0000 0000 0002`

2. **Attempt payment**

3. **Check webhook:** `payment_intent.payment_failed`

4. **Verify:** Order marked as failed

---

## 🔍 Monitoring Webhooks

### Stripe Dashboard

**View Recent Webhooks:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Click your endpoint
3. See "Recent deliveries"

**Check Each Delivery:**
- ✅ Status (200 OK = success)
- ⏱️ Response time
- 📦 Request body
- 📨 Response body
- 🔁 Retry attempts

### Application Logs

**Look for:**
```
[Webhook] Received event: payment_intent.succeeded (evt_xxx)
[Webhook] Payment succeeded: pi_xxx
[Webhook] Order abc123 marked as paid
[Webhook] VIP points awarded to user-id: 5 points
```

**Error Logs:**
```
[Webhook] Webhook signature verification failed
[Webhook] Order not found: xxx
[Webhook] Failed to award VIP points: error message
```

---

## 🐛 Troubleshooting

### Issue: "Invalid signature"

**Problem:** Webhook signature verification fails

**Solutions:**
1. Check `STRIPE_WEBHOOK_SECRET` is set correctly
2. Verify it matches the secret in Stripe Dashboard
3. Check for extra spaces in `.env`
4. Restart server after changing `.env`
5. Ensure using correct endpoint (test vs live)

**Test:**
```bash
# In your logs, look for:
echo $STRIPE_WEBHOOK_SECRET
# Should output: whsec_xxxxx
```

### Issue: "No order_id in metadata"

**Problem:** Payment intent missing order ID

**Solutions:**
1. Ensure order is created before payment intent
2. Check payment intent API includes metadata
3. Verify metadata is set correctly:
   ```typescript
   metadata: {
     order_id: order.id,
     customer_user_id: customer?.id
   }
   ```

### Issue: Webhook not firing

**Problem:** No webhook events received

**Solutions:**
1. Verify endpoint URL is correct
2. Check HTTPS is enabled (required)
3. Test endpoint manually with curl
4. Check firewall/security settings
5. Review Stripe webhook logs for errors

**Verify Endpoint:**
```bash
curl -I https://yourdomain.com/api/webhooks/stripe
# Should return: HTTP/2 200 or HTTP/2 400
# Should NOT return: HTTP/2 404
```

### Issue: Duplicate webhooks

**Problem:** Same webhook received multiple times

**Solutions:**
1. Implement idempotency (check if order already paid)
2. Stripe retries failed webhooks (3 attempts)
3. Always return 200 OK quickly
4. Process webhooks async if slow

**Example Idempotency:**
```typescript
// Before processing payment
const order = await getOrderById(orderId);

if (order.status === 'paid') {
  console.log('Order already paid, skipping');
  return; // Already processed
}

// Continue processing...
```

### Issue: Webhooks delayed

**Problem:** Webhooks arrive minutes late

**Possible Causes:**
- Stripe system delay (rare)
- Your server slow to respond
- Network issues

**Solutions:**
1. Optimize webhook handler (must respond quickly)
2. Return 200 OK immediately
3. Process work async after response
4. Monitor Stripe status: https://status.stripe.com

---

## 🔐 Security Best Practices

### Always Verify Signatures

**DO:**
```typescript
✅ const event = stripe.webhooks.constructEvent(body, signature, secret);
```

**DON'T:**
```typescript
❌ const event = JSON.parse(body); // Never trust raw data!
```

### Return 200 Quickly

**Good:**
```typescript
✅ Return 200 immediately, process async
return NextResponse.json({ received: true });
```

**Bad:**
```typescript
❌ Do lots of work before returning
// This causes timeouts and retries
```

### Handle Errors Gracefully

**Good:**
```typescript
✅ try/catch and log errors
✅ Return 200 even if processing fails (after logging)
✅ Implement retry logic for failures
```

**Bad:**
```typescript
❌ Return 500 on every error (causes infinite retries)
❌ Don't log errors
❌ Assume webhooks always succeed
```

### Implement Idempotency

**Always check if already processed:**

```typescript
if (order.status === 'paid') {
  return; // Already handled this webhook
}
```

---

## 📊 Webhook Events Reference

### payment_intent.succeeded

**When:** Payment completed successfully

**Action:**
- Mark order as paid
- Award VIP points
- Send receipt email
- Update inventory

**Metadata Available:**
- `order_id` - Your order ID
- `customer_user_id` - VIP member ID
- `staff_user_id` - Staff who processed

### payment_intent.payment_failed

**When:** Payment declined or failed

**Action:**
- Mark order as failed
- Notify customer
- Log failure reason
- Suggest retry with different card

**Failure Reasons:**
- Card declined
- Insufficient funds
- Expired card
- Invalid card
- 3D Secure failed

### payment_intent.canceled

**When:** Payment canceled before completion

**Action:**
- Mark order as cancelled
- Release inventory hold
- Notify staff

### charge.refunded

**When:** Payment refunded (full or partial)

**Action:**
- Update order status
- Reverse VIP points
- Send refund confirmation
- Update inventory

---

## 🎯 Testing Checklist

Before going live:

- [ ] Webhook endpoint created in Stripe
- [ ] Correct events selected
- [ ] Signing secret added to `.env`
- [ ] Application redeployed
- [ ] Test webhook sent from Stripe (200 OK)
- [ ] Real test payment successful
- [ ] Webhook received and processed
- [ ] Order marked as paid
- [ ] VIP points awarded
- [ ] Failed payment tested
- [ ] Webhook logs reviewed
- [ ] Application logs checked
- [ ] Error handling tested
- [ ] Signature verification working

---

## 📚 Additional Resources

**Stripe Webhooks Documentation:**
- Overview: https://stripe.com/docs/webhooks
- Best Practices: https://stripe.com/docs/webhooks/best-practices
- Testing: https://stripe.com/docs/webhooks/test
- Security: https://stripe.com/docs/webhooks/signatures

**Stripe CLI:**
- Installation: https://stripe.com/docs/stripe-cli
- Usage: https://stripe.com/docs/stripe-cli/webhooks
- Commands: https://stripe.com/docs/stripe-cli/commands

**Monitoring:**
- Webhook Logs: https://dashboard.stripe.com/webhooks
- Event Types: https://stripe.com/docs/api/events/types
- Retry Logic: https://stripe.com/docs/webhooks/best-practices#retry-logic

---

## 🎉 Summary

**Webhooks ensure:**
- ✅ 100% payment reliability
- ✅ VIP points always awarded
- ✅ Refunds handled automatically
- ✅ Production-ready reliability

**Setup Steps:**
1. Create endpoint in Stripe Dashboard
2. Add signing secret to `.env`
3. Redeploy application
4. Test with test webhook
5. Monitor in production

**Your webhook handler is ready for production! 🚀**
