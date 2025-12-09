# Production Deployment Guide

## 🚀 Going Live with VersaTalent POS

This guide walks you through deploying the POS system to production with real Stripe payments.

---

## ⚠️ Pre-Deployment Checklist

Before going live, ensure you have:

### Database
- [ ] Migration 008 run in production Neon database
- [ ] All tables created successfully
- [ ] Sample data removed (or kept if desired)
- [ ] Database backups configured

### Stripe Account
- [ ] Stripe account fully verified
- [ ] Business information complete
- [ ] Bank account connected for payouts
- [ ] Identity verification complete
- [ ] Tax information submitted

### Testing
- [ ] All features tested in development
- [ ] Test payments successful with test cards
- [ ] VIP points awarding verified
- [ ] NFC customer linking tested
- [ ] Order history viewing works
- [ ] Product management tested

### Security
- [ ] All `.env` variables set
- [ ] `.env` in `.gitignore`
- [ ] Admin password changed from default
- [ ] SESSION_SECRET is unique and secure
- [ ] HTTPS enabled (required for Stripe)

---

## 📋 Step-by-Step Deployment

### Step 1: Get Live Stripe API Keys

**⚠️ WARNING: Live keys process real money! Be careful!**

1. **Login to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com
   ```

2. **Toggle to Live Mode:**
   - Click "Test mode" toggle in top right
   - Switch to "Live mode"

3. **Get Live API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy **Publishable key** (starts with `pk_live_`)
   - Click "Reveal live key token"
   - Copy **Secret key** (starts with `sk_live_`)

4. **Save Keys Securely:**
   - Store in password manager
   - Never commit to git
   - Never share publicly

### Step 2: Configure Production Environment

**On your production server (e.g., Netlify, Vercel):**

1. **Add Environment Variables:**

   ```bash
   # Database
   DATABASE_URL=postgresql://your-production-db-url

   # Admin Auth
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-strong-password
   SESSION_SECRET=your-very-long-random-secret-key-min-32-chars

   # Stripe LIVE Keys
   STRIPE_SECRET_KEY=sk_live_51xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_51xxxxxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51xxxxxxxxxxxxx

   # Stripe Webhook (set after Step 3)
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

   # Environment
   NODE_ENV=production
   ```

2. **Verify All Variables Set:**
   - Check no test keys are used
   - Ensure all live keys start with `sk_live_` or `pk_live_`
   - Confirm webhook secret is set (after Step 3)

### Step 3: Set Up Stripe Webhooks

**Why Webhooks?**
- Ensures payments are processed even if user closes browser
- Provides redundancy for payment confirmation
- Enables refund handling
- Required for production reliability

#### 3.1 Configure Webhook Endpoint

1. **Go to Stripe Webhooks:**
   ```
   https://dashboard.stripe.com/webhooks
   ```

2. **Click "Add endpoint"**

3. **Enter Webhook URL:**
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```

   Replace `yourdomain.com` with your actual domain!

4. **Select Events to Listen:**
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.refunded`

5. **Click "Add endpoint"**

#### 3.2 Get Webhook Signing Secret

1. **After creating endpoint, click on it**

2. **Copy "Signing secret"** (starts with `whsec_`)

3. **Add to Environment Variables:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
   ```

4. **Redeploy** your application with new env var

#### 3.3 Test Webhook

1. **Click "Send test webhook"** in Stripe Dashboard

2. **Select event:** `payment_intent.succeeded`

3. **Check logs** for successful processing

4. **Expected response:** `200 OK` with `{"received": true}`

### Step 4: Deploy Application

**For Netlify (recommended):**

1. **Connect GitHub Repository:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import from Git"
   - Select your repository
   - Branch: `main`

2. **Configure Build Settings:**
   ```
   Build command: bun run build
   Publish directory: .next
   ```

3. **Add Environment Variables:**
   - Copy all from Step 2
   - Save and deploy

4. **Enable HTTPS:**
   - Automatically enabled by Netlify
   - Custom domain: Add SSL certificate

**For Vercel:**

1. **Connect Repository:**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables:**
   ```bash
   vercel env add STRIPE_SECRET_KEY
   # ... add all other vars
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

**For Other Platforms:**

Ensure:
- Node.js 18+ or Bun runtime
- Environment variables set
- HTTPS enabled
- Build command: `bun run build`
- Start command: `bun run start`

### Step 5: Post-Deployment Verification

#### 5.1 Check Deployment

1. **Visit your site:**
   ```
   https://yourdomain.com
   ```

2. **Verify HTTPS:**
   - Should see lock icon in browser
   - Required for Stripe

3. **Test Admin Login:**
   ```
   https://yourdomain.com/admin/login
   ```

#### 5.2 Test Live Payment (Small Amount)

**⚠️ This will charge your own card!**

1. **Go to POS:**
   ```
   https://yourdomain.com/pos
   ```

2. **Add ONE cheap item** (€1-2)

3. **Click Checkout**

4. **Use YOUR OWN card**

5. **Complete payment**

6. **Verify Success:**
   - Success message appears
   - Order in admin panel
   - Payment in Stripe Dashboard

7. **Refund Test Payment:**
   - Go to Stripe Dashboard
   - Find payment
   - Click "Refund"

#### 5.3 Verify Webhook

1. **Complete another test payment**

2. **Check Stripe Webhook Logs:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click your webhook endpoint
   - See "Recent deliveries"
   - Status should be: ✅ `200 OK`

3. **Check Application Logs:**
   - Look for: `[Webhook] Payment succeeded`
   - Order should be marked as paid
   - VIP points awarded (if customer linked)

#### 5.4 Test VIP Points

1. **Create test VIP member** in admin

2. **Create NFC card** for member

3. **Process sale with linked customer**

4. **Verify points awarded**

---

## 🔒 Security Best Practices

### Production Environment

- [ ] **HTTPS Only** - No HTTP allowed
- [ ] **Strong Passwords** - Admin, database, Stripe
- [ ] **Session Secret** - 32+ characters, random
- [ ] **Environment Variables** - Never in code
- [ ] **Webhook Signature** - Always verify
- [ ] **Rate Limiting** - Enable on payment endpoints
- [ ] **IP Whitelisting** - For admin panel (optional)

### Stripe Security

- [ ] **Secret Keys** - Server-side only, never expose
- [ ] **Publishable Keys** - Client-side OK
- [ ] **Webhook Secret** - Keep secure
- [ ] **Test vs Live** - Never mix environments
- [ ] **Key Rotation** - Rotate every 90 days (recommended)

### Access Control

- [ ] **Admin Panel** - Strong authentication required
- [ ] **POS Routes** - Staff/admin only
- [ ] **Database** - Restrict access by IP
- [ ] **API Keys** - Role-based permissions

---

## 📊 Monitoring & Maintenance

### Daily Checks

1. **Stripe Dashboard:**
   - Review payments
   - Check for failures
   - Monitor disputes

2. **Application Logs:**
   - Payment errors
   - Webhook failures
   - Database issues

3. **Order History:**
   - Review recent orders
   - Check for anomalies

### Weekly Tasks

1. **Reconcile Payments:**
   - Match Stripe payments to orders
   - Verify all paid orders
   - Investigate discrepancies

2. **Review Metrics:**
   - Total sales
   - Average order value
   - VIP vs guest ratio
   - Payment success rate

3. **Export Reports:**
   - Download Stripe reports
   - Export order data
   - Backup database

### Monthly Maintenance

1. **Security Audit:**
   - Review access logs
   - Check for suspicious activity
   - Update passwords

2. **Performance Review:**
   - Check response times
   - Monitor error rates
   - Optimize slow queries

3. **Stripe Account:**
   - Verify payout schedule
   - Review fees
   - Check for holds

---

## 🆘 Troubleshooting Production Issues

### Payment Failures

**Symptom:** Customer's payment fails

**Diagnosis:**
1. Check Stripe Dashboard for error
2. Review webhook logs
3. Check order status in database

**Common Causes:**
- Insufficient funds
- Card declined
- 3D Secure failure
- Network timeout

**Solutions:**
- Ask customer to try different card
- Verify amount is above €0.50
- Check Stripe is in live mode
- Review Stripe logs for details

### Webhook Not Firing

**Symptom:** Orders stay "pending" after successful payment

**Diagnosis:**
1. Check Stripe webhook logs
2. Review application logs
3. Test webhook endpoint manually

**Common Causes:**
- Webhook URL incorrect
- Signature verification failing
- Application not responding
- Firewall blocking requests

**Solutions:**
- Verify webhook URL is correct (https://yourdomain.com/api/webhooks/stripe)
- Check STRIPE_WEBHOOK_SECRET is set
- Test endpoint: `curl -X POST https://yourdomain.com/api/webhooks/stripe`
- Review application logs for errors

### VIP Points Not Awarded

**Symptom:** Payment successful but no points awarded

**Diagnosis:**
1. Check if customer was linked
2. Review VIP membership exists
3. Check points log table

**Common Causes:**
- Customer not linked to order
- VIP membership missing
- Webhook handler error
- Database connection issue

**Solutions:**
- Ensure customer linked before checkout
- Verify VIP membership exists
- Check webhook logs
- Manually award points if needed

### Database Connection Lost

**Symptom:** "Database connection failed" errors

**Diagnosis:**
1. Check Neon dashboard
2. Verify DATABASE_URL is correct
3. Test connection from server

**Common Causes:**
- Database paused (Neon free tier)
- Connection limit reached
- Network issue
- Invalid credentials

**Solutions:**
- Restart database
- Increase connection pool
- Check Neon status page
- Verify DATABASE_URL

---

## 📞 Support & Resources

### Getting Help

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com/support
- Docs: https://stripe.com/docs
- Email: support@stripe.com
- Phone: Available for verified accounts

**VersaTalent POS:**
- Documentation: See all MD files in project
- Validation: `bun run check-stripe`
- Logs: Check application console

**Deployment Platform:**
- Netlify: https://docs.netlify.com
- Vercel: https://vercel.com/docs
- Neon: https://neon.tech/docs

### Emergency Contacts

**Critical Payment Issue:**
1. Pause Stripe account temporarily
2. Contact Stripe support immediately
3. Review all recent transactions
4. Notify customers if needed

**Data Breach Suspected:**
1. Revoke all API keys immediately
2. Change all passwords
3. Review access logs
4. Contact Stripe security team
5. Notify affected users

---

## 🎯 Go-Live Checklist

### Pre-Launch

- [ ] All tests passing
- [ ] Live Stripe keys configured
- [ ] Webhooks set up and tested
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Admin password changed
- [ ] Database backup configured
- [ ] Staff trained
- [ ] Test payment successful
- [ ] Refund tested

### Launch Day

- [ ] Monitor Stripe Dashboard
- [ ] Watch application logs
- [ ] Have support team ready
- [ ] Test first real transaction
- [ ] Verify webhook delivery
- [ ] Check VIP points awarding

### Post-Launch

- [ ] Daily monitoring for 1 week
- [ ] Review all payments
- [ ] Check for errors
- [ ] Gather staff feedback
- [ ] Optimize based on usage
- [ ] Plan improvements

---

## 🎉 Success Metrics

Track these to measure success:

### Payment Metrics
- **Success Rate:** Target > 95%
- **Average Order Value:** Track trend
- **Processing Time:** Target < 5 seconds
- **Refund Rate:** Target < 2%

### Business Metrics
- **Daily Revenue:** Monitor growth
- **VIP Conversion:** % of sales with VIP
- **Peak Hours:** Optimize staffing
- **Popular Products:** Optimize inventory

### Technical Metrics
- **Uptime:** Target > 99.9%
- **Error Rate:** Target < 0.1%
- **Response Time:** Target < 1 second
- **Webhook Success:** Target 100%

---

## 🚀 You're Ready to Go Live!

**Final Steps:**

1. ✅ Review this entire guide
2. ✅ Complete all checklists
3. ✅ Test everything thoroughly
4. ✅ Train your staff
5. ✅ Monitor closely for first week
6. ✅ Celebrate your launch! 🎉

**Your VersaTalent POS is production-ready!**

Good luck with your launch! 🚀💳✨
