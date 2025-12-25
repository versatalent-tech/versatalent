# 🚀 Stripe Customer Integration - Deployment Checklist

**Version**: 180
**Migration**: 012_stripe_customer_integration.sql

---

## ⚡ Quick Start (Development)

```bash
# 1. Run the migration
cd versatalent
psql $DATABASE_URL -f src/db/migrations/012_stripe_customer_integration.sql

# 2. Verify Stripe keys are set
cat .env.local | grep STRIPE

# Should see:
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 3. Restart dev server
bun run dev

# 4. Test it works
# - Create a user at /admin/nfc
# - Check user has stripe_customer_id
# - Make a payment at /staff/pos
# - View purchase history at /admin/nfc
```

---

## 📋 Pre-Deployment Checklist

### Database

- [ ] Backup production database before migration
- [ ] Run migration 012 in production:
  ```sql
  psql $DATABASE_URL -f src/db/migrations/012_stripe_customer_integration.sql
  ```
- [ ] Verify migration succeeded (check for success message)
- [ ] Confirm `stripe_customer_id` column exists:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  AND column_name = 'stripe_customer_id';
  ```

### Environment Variables

- [ ] Production Stripe keys are set in Netlify:
  - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
- [ ] Test keys removed from production environment
- [ ] Webhook secret updated if using Stripe webhooks:
  - `STRIPE_WEBHOOK_SECRET`

### Code Deployment

- [ ] All files committed to Git
- [ ] Pushed to GitHub
- [ ] Netlify deployment triggered
- [ ] Build succeeded (no errors)
- [ ] Environment variables loaded correctly

### Testing

- [ ] Create a test user in production
- [ ] Verify Stripe customer created (check Stripe dashboard)
- [ ] Process a small test payment (€0.50)
- [ ] Verify payment linked to customer in Stripe
- [ ] Check purchase history shows the order
- [ ] Test Stripe dashboard links work

### Monitoring

- [ ] Check server logs for errors
- [ ] Monitor Stripe dashboard for test charges
- [ ] Set up alerts for failed Stripe API calls
- [ ] Document any errors encountered

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong, you can rollback safely:

### Option 1: Rollback Migration Only

```sql
-- Remove the column (data will be lost!)
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;

-- Remove the index
DROP INDEX IF EXISTS idx_users_stripe_customer_id;

-- Remove the constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_stripe_customer_id;
```

**Note**: This doesn't break existing functionality! The app will work fine without `stripe_customer_id`. Stripe customers will just be created on the fly during payments.

### Option 2: Revert Code Changes

1. **Redeploy previous version** from Netlify deployments
2. **Or** git revert the Stripe integration commits
3. **Keep the migration** - it won't hurt to have the column even if unused

---

## 🧪 Post-Deployment Tests

### Test 1: User Creation ✓

```bash
# Via Admin UI
1. Go to /admin/nfc
2. Create user: "Production Test User"
3. Email: "prodtest@example.com"

# Verify in Database
psql $DATABASE_URL -c "
  SELECT name, email, stripe_customer_id
  FROM users
  WHERE email = 'prodtest@example.com';
"

# Verify in Stripe
# Go to https://dashboard.stripe.com/customers
# Search for prodtest@example.com
# Should exist with metadata
```

### Test 2: POS Payment ✓

```bash
# Via Staff POS
1. Go to /staff/pos
2. Add items to cart
3. Select "Production Test User"
4. Process payment with real card (€0.50)

# Verify in Stripe
# Go to https://dashboard.stripe.com/payments
# Find the €0.50 charge
# Check "Customer" field is populated
# Verify metadata has order_id

# Verify in Database
psql $DATABASE_URL -c "
  SELECT id, total_cents, status, stripe_payment_intent_id
  FROM pos_orders
  WHERE customer_user_id = (
    SELECT id FROM users WHERE email = 'prodtest@example.com'
  );
"
```

### Test 3: Purchase History ✓

```bash
# Via Admin UI
1. Go to /admin/nfc
2. Find "Production Test User"
3. Click receipt icon (📄)
4. Verify dialog shows:
   - Total orders: 1
   - Total spent: €0.50
   - Order details
   - Stripe customer ID
5. Click "View in Stripe"
6. Verify opens Stripe customer page
```

### Test 4: Error Handling ✓

```bash
# Test 1: User creation when Stripe is down
1. Temporarily disconnect internet
2. Create a user
3. User should still be created
4. Check logs for Stripe error
5. stripe_customer_id should be null
6. Reconnect internet

# Test 2: Payment for user without Stripe ID
1. Process payment for the user from Test 1
2. Should create Stripe customer on-the-fly
3. Payment should succeed
4. User now has stripe_customer_id
```

---

## 📊 Success Metrics

After deployment, monitor these metrics:

### Day 1
- [ ] No user creation failures
- [ ] No payment processing failures
- [ ] All Stripe API calls succeeding
- [ ] Purchase history loads correctly

### Week 1
- [ ] 100% of new users have Stripe customer IDs
- [ ] 100% of payments linked to customers
- [ ] No Stripe API errors in logs
- [ ] Admin team can view purchase histories

### Month 1
- [ ] Backfill complete for existing users
- [ ] Customer insights being used
- [ ] Revenue tracking via Stripe dashboard
- [ ] No rollbacks needed

---

## 🔧 Troubleshooting in Production

### Issue: No Stripe customers being created

**Diagnosis**:
```bash
# Check environment variables
echo $STRIPE_SECRET_KEY

# Check recent logs
# Netlify → Functions → View logs
# Look for "Failed to create Stripe customer"
```

**Fix**:
1. Verify Stripe key is correct (starts with `sk_live_`)
2. Check Stripe account is active
3. Verify Stripe API is not down (status.stripe.com)
4. Check rate limits not exceeded

### Issue: Payments not linking to customers

**Diagnosis**:
```bash
# Check if orders have customer_user_id
psql $DATABASE_URL -c "
  SELECT id, customer_user_id, stripe_payment_intent_id
  FROM pos_orders
  WHERE created_at > NOW() - INTERVAL '1 hour'
  LIMIT 10;
"
```

**Fix**:
1. Ensure customer selected in POS before checkout
2. Check NFC card reader is working
3. Verify user has stripe_customer_id
4. If missing, will be created on next payment

### Issue: Purchase history not loading

**Diagnosis**:
```bash
# Test API endpoint directly
curl https://your-site.netlify.app/api/admin/users/USER_ID/purchases \
  -H "Cookie: admin_session=..." \
  | jq
```

**Fix**:
1. Check admin authentication is working
2. Verify migration 012 was run
3. Check database has orders with status='paid'
4. Look for errors in Netlify function logs

---

## 📞 Emergency Contacts

### Stripe Issues
- **Stripe Support**: support@stripe.com
- **Stripe Status**: https://status.stripe.com
- **Stripe Dashboard**: https://dashboard.stripe.com

### Database Issues
- **Neon Support**: support@neon.tech
- **Neon Dashboard**: https://console.neon.tech

### Netlify Issues
- **Netlify Support**: support@netlify.com
- **Netlify Dashboard**: https://app.netlify.com

---

## 📝 Deployment Log Template

```markdown
# Stripe Integration Deployment

**Date**: _______________
**Deployed By**: _______________
**Environment**: Production

## Pre-Deployment
- [ ] Database backup completed
- [ ] Migration 012 tested in staging
- [ ] Stripe keys verified
- [ ] Team notified

## Deployment Steps
- [ ] Migration 012 executed at: _______
- [ ] Code deployed at: _______
- [ ] Netlify build #: _______
- [ ] Tests passed at: _______

## Post-Deployment
- [ ] User creation test: ✓/✗
- [ ] Payment test: ✓/✗
- [ ] Purchase history test: ✓/✗
- [ ] Error handling test: ✓/✗

## Issues Encountered
_None / List issues here_

## Rollback Required?
_No / Yes - reason_

## Notes
_Any additional notes_

**Sign-off**: _______________ (Name & Date)
```

---

## ✅ Production Deployment Complete!

Once all checklist items are done:

1. Mark deployment as complete
2. Update team documentation
3. Train staff on new features
4. Monitor for 24-48 hours
5. Plan for backfill of existing users
6. Schedule future enhancements

---

**Questions?** See `STRIPE_CUSTOMER_INTEGRATION.md` for full documentation.

**Issues?** Check logs, consult troubleshooting guide, contact support.

**Success?** Celebrate! 🎉 You've successfully integrated Stripe Customer management!
