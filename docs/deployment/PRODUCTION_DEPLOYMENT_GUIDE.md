# VersaTalent Production Deployment Guide

## ✅ Deployment Status

**Your site is LIVE at:** https://same-i3xfumkpmp9-latest.netlify.app

**Deployment Date:** December 2025
**Deployment Type:** Dynamic Next.js site on Netlify
**Version:** 167 (Production Ready - Staff POS Complete)

---

## 🚨 CRITICAL: Required Configuration Steps

**⚠️ The following steps MUST be completed before using the production system:**

### 1. Configure Environment Variables on Netlify

Your application needs these environment variables to function. You must add them to Netlify:

#### How to Add Environment Variables:

1. Go to your Netlify dashboard: https://app.netlify.com
2. Find your site: `same-i3xfumkpmp9-latest`
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** for each one below

#### Required Environment Variables:

```bash
# Database (Already configured - verify it's set)
DATABASE_URL=postgresql://neondb_owner:npg_7lSOGPYyIDW6@ep-royal-leaf-a4rl6jau-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Stack Auth (Already configured - verify)
NEXT_PUBLIC_STACK_PROJECT_ID=846d74a5-4d74-4c46-a89c-1f7c5bc397f5
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_5yanfb8k3bpm70wbx6m2yg81k8bx8cn7snwwq23xcvtfg
STACK_SECRET_SERVER_KEY=ssk_qa1gfsf4kbbghsrkgcp5n4sk79q4c0bfsfcnppqfsz67r

# NextAuth Configuration (CHANGE THESE!)
NEXTAUTH_URL=https://same-i3xfumkpmp9-latest.netlify.app
NEXTAUTH_SECRET=GENERATE_NEW_SECRET_HERE_MIN_32_CHARS

# Site URL (Update to your domain)
NEXT_PUBLIC_SITE_URL=https://same-i3xfumkpmp9-latest.netlify.app

# Admin Authentication (⚠️ CHANGE IMMEDIATELY!)
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password_here

# Session Secret (⚠️ CHANGE IMMEDIATELY!)
SESSION_SECRET=GENERATE_LONG_RANDOM_STRING_HERE_MIN_64_CHARS

# SumUp (card payments at the till)
SUMUP_API_KEY=sup_sk_your_secret_key
SUMUP_MERCHANT_CODE=MC0X0ABC
SUMUP_AFFILIATE_KEY=your_affiliate_key
SUMUP_AFFILIATE_APP_ID=your_affiliate_app_id
```

#### How to Generate Secure Secrets:

**For NEXTAUTH_SECRET (32+ characters):**
```bash
# In terminal:
openssl rand -base64 32

# Or in Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**For SESSION_SECRET (64+ characters):**
```bash
openssl rand -base64 64

# Or:
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

#### After Adding Variables:

1. Click **Save**
2. Go to **Deploys** → **Trigger deploy** → **Deploy site**
3. Wait for redeployment to complete (~2-3 minutes)

---

### 2. Run Database Migration

The inventory management migration MUST be run on your production database:

```bash
# Connect to your Neon database
psql postgresql://neondb_owner:npg_7lSOGPYyIDW6@ep-royal-leaf-a4rl6jau-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Run the migration
\i migrations/011_inventory_management.sql

# Or copy/paste the SQL from the file
```

**What this creates:**
- `inventory_movements` table (audit trail)
- `low_stock_threshold` column in `products` table
- Updated VIP system constraints for POS integration

**Verify migration:**
```sql
-- Check tables exist
\d inventory_movements
\d products

-- Verify columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'low_stock_threshold';
```

---

### 3. Create Production Staff Users

Create staff accounts with secure passwords:

```sql
-- Generate bcrypt hash for password
-- Use: https://bcrypt-generator.com or Node.js

-- Create staff user
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'John Doe',
  'staff@yourdomain.com',
  '$2a$10$...YOUR_BCRYPT_HASH_HERE...',  -- Password hash
  'staff'
);

-- Create admin user
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin User',
  'admin@yourdomain.com',
  '$2a$10$...YOUR_BCRYPT_HASH_HERE...',
  'admin'
);
```

**Generate bcrypt hash in Node.js:**
```javascript
const bcrypt = require('bcryptjs');
const password = 'YourSecurePassword123!';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

---

### 4. Set Up SumUp (For Card Payments)

To take card payments at the till:

1. In the SumUp dashboard (me.sumup.com → **Developers**), create a secret API key and an affiliate key, and note your merchant code and the affiliate app ID
2. Add the four `SUMUP_*` variables above in Netlify, then redeploy
3. Open **Admin → Card Payments (SumUp)**: it should say "Connected to SumUp"
4. Pair each Solo reader on the same page

No webhook setup is needed. Full guide: `docs/setup/SUMUP_SETUP_GUIDE.md`.

---

### 5. Create Test Products

Add products to your production database:

```sql
INSERT INTO products (name, description, price_cents, currency, category, stock_quantity, low_stock_threshold, is_active)
VALUES
  -- Drinks
  ('Espresso', 'Double shot espresso', 250, 'EUR', 'Drinks', 100, 10, true),
  ('Cappuccino', 'Classic cappuccino', 350, 'EUR', 'Drinks', 80, 10, true),
  ('Latte', 'Smooth latte', 380, 'EUR', 'Drinks', 80, 10, true),
  ('Americano', 'Black coffee', 220, 'EUR', 'Drinks', 100, 10, true),

  -- Food
  ('Croissant', 'Butter croissant', 200, 'EUR', 'Food', 50, 10, true),
  ('Sandwich', 'Club sandwich', 550, 'EUR', 'Food', 30, 5, true),
  ('Muffin', 'Blueberry muffin', 280, 'EUR', 'Food', 40, 8, true),

  -- Beverages
  ('Water', 'Bottled water', 150, 'EUR', 'Beverages', 200, 20, true),
  ('Juice', 'Fresh orange juice', 320, 'EUR', 'Beverages', 50, 10, true);
```

---

### 6. Configure VIP Points Rules

Set up loyalty points for POS purchases:

```sql
-- 1 point per €1 spent
INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
VALUES ('consumption', 1, 'euro', true)
ON CONFLICT (action_type) DO UPDATE
SET points_per_unit = 1, is_active = true;
```

---

## 🔐 Security Checklist

Before going live, verify:

- [ ] Changed `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- [ ] Generated new `NEXTAUTH_SECRET` (32+ chars)
- [ ] Generated new `SESSION_SECRET` (64+ chars)
- [ ] Using strong passwords for staff users (bcrypt hashed)
- [ ] Database connection uses SSL (`sslmode=require`)
- [ ] SumUp API key is the secret key (`sup_sk_...`) for the live merchant account
- [ ] Environment variables are set in Netlify (not in code)
- [ ] No sensitive data committed to Git

---

## 🧪 Testing Production Deployment

### Test 1: Homepage

Visit: https://same-i3xfumkpmp9-latest.netlify.app

**Expected:**
- ✅ Homepage loads without errors
- ✅ Navigation works
- ✅ All sections display correctly

### Test 2: Staff Login

Visit: https://same-i3xfumkpmp9-latest.netlify.app/staff/login

**Steps:**
1. Enter staff credentials
2. Click "Sign In"

**Expected:**
- ✅ Login successful
- ✅ Redirects to `/staff/pos`
- ✅ Session cookie created

### Test 3: Staff POS

Visit: https://same-i3xfumkpmp9-latest.netlify.app/staff/pos

**Expected:**
- ✅ Requires authentication (redirects to login if not logged in)
- ✅ Products load from database
- ✅ Stock indicators show correctly
- ✅ Cart operations work
- ✅ Logout button works

### Test 4: Create Test Order

**Steps:**
1. Login as staff
2. Add products to cart
3. Click "Checkout"
4. Complete payment

**Expected:**
- ✅ Order created in database
- ✅ Stock deducted automatically
- ✅ Inventory movement recorded
- ✅ Success message shown

### Test 5: Verify Database

```sql
-- Check recent order
SELECT * FROM pos_orders ORDER BY created_at DESC LIMIT 1;

-- Check inventory movement
SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 1;

-- Check product stock
SELECT name, stock_quantity FROM products ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 Monitoring & Maintenance

### Netlify Logs

View deployment and function logs:
1. Netlify Dashboard → Your site
2. **Deploys** → Click on latest deploy
3. **Functions** tab to see API logs

### Database Monitoring

Monitor Neon database:
1. https://console.neon.tech
2. Select your project
3. View **Monitoring** tab for:
   - Connection count
   - Query performance
   - Storage usage

### Daily Checks

- [ ] Check Netlify deployment status
- [ ] Monitor database connection health
- [ ] Review POS order logs
- [ ] Check inventory movements
- [ ] Verify low stock alerts

### Weekly Tasks

- [ ] Review inventory movements audit trail
- [ ] Check VIP points transactions
- [ ] Backup database
- [ ] Review SumUp transactions against Admin → POS Orders
- [ ] Update staff users if needed

---

## 🐛 Troubleshooting Production Issues

### Issue: "Database connection failed"

**Cause:** DATABASE_URL not set in Netlify

**Fix:**
1. Netlify Dashboard → Site settings → Environment variables
2. Add `DATABASE_URL` with your Neon connection string
3. Trigger redeploy

### Issue: "Staff login not working"

**Possible causes:**
1. Staff user doesn't exist in database
2. Password hash incorrect
3. User role is not 'staff' or 'admin'

**Fix:**
```sql
-- Check user exists
SELECT id, name, email, role, password_hash IS NOT NULL as has_password
FROM users
WHERE email = 'your@email.com';

-- Update role if needed
UPDATE users SET role = 'staff' WHERE email = 'your@email.com';
```

### Issue: "Products not loading"

**Cause:** Migration not run or products table empty

**Fix:**
```sql
-- Verify products table
SELECT COUNT(*) FROM products;

-- If empty, insert test products (see step 5 above)
```

### Issue: "Card payment not working"

**Possible causes:**
1. SumUp settings missing or wrong
2. Reader not paired, offline or logged in to the SumUp app
3. App payment code typed wrongly or for a different amount

**Fix:**
1. Open Admin → Card Payments (SumUp) and check every setting has a tick and it says "Connected to SumUp"
2. Re-pair the reader if it isn't listed
3. See the troubleshooting section of `docs/setup/SUMUP_SETUP_GUIDE.md`

### Issue: "Stock not deducting"

**Cause:** Migration not run

**Fix:**
```sql
-- Verify inventory_movements table exists
\d inventory_movements

-- If not, run migration (see step 2 above)
```

---

## 🚀 Custom Domain Setup (Optional)

To use your own domain:

### Step 1: Add Custom Domain in Netlify

1. Netlify Dashboard → Site settings → Domain management
2. Click **Add custom domain**
3. Enter your domain (e.g., `pos.yourdomain.com`)
4. Follow DNS instructions

### Step 2: Update Environment Variables

```bash
NEXTAUTH_URL=https://pos.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://pos.yourdomain.com
```

### Step 3: Update the Site URL

Set `NEXT_PUBLIC_SITE_URL` to the new domain:
```
https://pos.yourdomain.com
```
SumUp reports reader payments to `<site URL>/api/webhooks/sumup`, and NFC card addresses use the same URL.

### Step 4: Redeploy

Trigger new deployment after updating variables.

---

## 📈 Performance Optimization

### Enable Caching

Netlify automatically caches static assets. For database queries:

```typescript
// In your API routes, add:
export const dynamic = 'force-dynamic';  // Disable caching for real-time data
// OR
export const revalidate = 60;  // Revalidate every 60 seconds
```

### Database Connection Pooling

Neon automatically pools connections. Monitor usage:
- Neon Console → Monitoring
- Adjust connection limits if needed

### Image Optimization

All images use Next.js Image component for automatic optimization.

---

## 📞 Support & Resources

### Documentation

- **Full System Guide:** `STAFF_POS_GUIDE.md`
- **Testing Guide:** `STAFF_POS_TESTING_GUIDE.md`
- **Quick Start:** `STAFF_POS_QUICK_START.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`

### External Resources

- **Netlify Docs:** https://docs.netlify.com
- **Next.js Docs:** https://nextjs.org/docs
- **Neon Docs:** https://neon.tech/docs
- **SumUp Developer Docs:** https://developer.sumup.com

### Need Help?

- Check troubleshooting section above
- Review error messages in Netlify function logs
- Verify all environment variables are set
- Check database connection in Neon Console

---

## ✅ Production Launch Checklist

Before announcing your POS system is live:

**Environment:**
- [ ] All environment variables configured
- [ ] Secrets changed from development defaults
- [ ] SumUp connected and readers paired (if taking card payments)

**Database:**
- [ ] Migration 011 executed
- [ ] Staff users created
- [ ] Products added
- [ ] VIP points rules configured
- [ ] Database backup created

**Security:**
- [ ] Admin password changed
- [ ] Session secrets regenerated
- [ ] Staff passwords are strong (bcrypt)
- [ ] No secrets in Git repository

**Testing:**
- [ ] Staff can login
- [ ] Products load correctly
- [ ] Cart operations work
- [ ] Checkout creates orders
- [ ] Stock deducts after payment
- [ ] Inventory movements recorded
- [ ] Loyalty points award (if VIP linked)

**Monitoring:**
- [ ] Netlify deployment successful
- [ ] Database connections healthy
- [ ] Logs accessible
- [ ] Error tracking setup

**Documentation:**
- [ ] Staff trained on POS system
- [ ] Admin procedures documented
- [ ] Emergency contacts listed
- [ ] Backup procedures in place

---

## 🎉 Your Production URLs

**Main Site:** https://same-i3xfumkpmp9-latest.netlify.app
**Staff Login:** https://same-i3xfumkpmp9-latest.netlify.app/staff/login
**Staff POS:** https://same-i3xfumkpmp9-latest.netlify.app/staff/pos
**Admin Dashboard:** https://same-i3xfumkpmp9-latest.netlify.app/admin

**Netlify Dashboard:** https://app.netlify.com/sites/same-i3xfumkpmp9-latest
**Neon Database:** https://console.neon.tech

---

**Deployment completed:** December 2025
**Version:** 167 - Production Ready
**Status:** ✅ Live (Requires configuration)

**Next Steps:**
1. Complete environment variable configuration
2. Run database migration
3. Create staff users
4. Add products
5. Test end-to-end
6. Go live! 🚀
