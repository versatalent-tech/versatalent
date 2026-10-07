# 🚀 Production Deployment Checklist

Use this checklist to ensure everything is ready before going live.

---

## 📋 Pre-Deployment (Do First)

### Database Setup
- [ ] Migration 008 run in production Neon database
- [ ] All tables created successfully (`products`, `pos_orders`, `pos_order_items`)
- [ ] Sample data removed or reviewed
- [ ] Database connection tested from production server
- [ ] Backups configured (automatic daily backups)
- [ ] Connection pooling configured

### SumUp Account
- [ ] SumUp merchant account verified
- [ ] Bank account connected for payouts
- [ ] Solo card reader(s) charged and on Wi-Fi

### Testing Complete
- [ ] All features tested in development
- [ ] Test payments successful (4242 4242 4242 4242)
- [ ] VIP points awarding verified
- [ ] NFC customer linking tested (manual entry works)
- [ ] Order creation successful
- [ ] Order history viewing works
- [ ] Product management tested
- [ ] Admin authentication works
- [ ] Staff POS access works

---

## 🔑 Environment Configuration

### Get Production Credentials

- [ ] **SumUp Keys** (me.sumup.com → Developers):
  - [ ] `SUMUP_API_KEY` (secret key, sup_sk_...)
  - [ ] `SUMUP_MERCHANT_CODE`
  - [ ] `SUMUP_AFFILIATE_KEY`
  - [ ] `SUMUP_AFFILIATE_APP_ID`

- [ ] **Production Database:**
  - [ ] `DATABASE_URL` (Neon production connection string)

- [ ] **Security:**
  - [ ] `ADMIN_USERNAME` (change from default!)
  - [ ] `ADMIN_PASSWORD` (strong password!)
  - [ ] `SESSION_SECRET` (32+ random characters)

### Set Environment Variables

**On Netlify:**
- [ ] Navigate to Site settings → Environment variables
- [ ] Add all required variables
- [ ] Save and redeploy

**On Vercel:**
- [ ] Run: `vercel env add VARIABLE_NAME`
- [ ] Add all required variables
- [ ] Redeploy: `vercel --prod`

**Required Variables:**
```bash
DATABASE_URL=postgresql://...
ADMIN_USERNAME=your-admin
ADMIN_PASSWORD=strong-password-min-12-chars
SESSION_SECRET=random-32-char-minimum-secret
SUMUP_API_KEY=sup_sk_...
SUMUP_MERCHANT_CODE=MC0X0ABC
SUMUP_AFFILIATE_KEY=...
SUMUP_AFFILIATE_APP_ID=...
NODE_ENV=production
```

---

## 💳 SumUp Setup

- [ ] Admin → Card Payments (SumUp) shows all four settings and "Connected to SumUp"
- [ ] Each Solo reader paired (Admin → Card Payments → Pair a Solo reader)
- [ ] Migration `022_sumup_payments.sql` run
- [ ] No webhook setup needed: the site tells SumUp where to report each reader payment (`/api/webhooks/sumup`)

See `docs/setup/SUMUP_SETUP_GUIDE.md`.

---

## 🌐 Deployment

### Build & Deploy
- [ ] Code committed to git
- [ ] Pushed to main branch
- [ ] Deployment platform connected (Netlify/Vercel)
- [ ] Build successful (no errors)
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### Verification
- [ ] Site loads: `https://yourdomain.com`
- [ ] HTTPS working (lock icon in browser)
- [ ] Admin login works: `/admin/login`
- [ ] POS loads: `/staff/pos`
- [ ] Product management works: `/admin/pos/products`
- [ ] Order history works: `/admin/pos/orders`
- [ ] No console errors

---

## 🧪 Production Testing

### Test Payment (Your Own Card!)
⚠️ **This will charge your card! Use small amount!**

- [ ] Go to: `https://yourdomain.com/staff/pos`
- [ ] Add ONE cheap item (£1-2)
- [ ] Click "Checkout", choose **Card reader** and pay on the Solo with your own card
- [ ] ✅ Success message appears
- [ ] ✅ Order appears in Admin → POS Orders (status: paid, "SumUp card reader" with the transaction code)
- [ ] ✅ Payment appears in the SumUp dashboard with the same transaction code
- [ ] Repeat with **SumUp app** (enter the transaction code) and **Cash**

### Refund Test Payment
- [ ] Refund the test payment in the SumUp app or dashboard
- [ ] Cancel the order in Admin if needed

### Test VIP Points
- [ ] Create test VIP member in admin
- [ ] Create NFC card for member
- [ ] Link customer at POS (manual entry: card UID)
- [ ] Process €15 sale
- [ ] ✅ Customer linked successfully
- [ ] ✅ Payment processed
- [ ] ✅ 5 points awarded (€15 ÷ 3)
- [ ] ✅ Points visible in VIP admin panel

---

## 🔒 Security Checklist

### Access Control
- [ ] Admin password changed from default
- [ ] Strong password (12+ chars, mixed case, numbers, symbols)
- [ ] `SESSION_SECRET` is unique and random (32+ chars)
- [ ] `.env` file not committed to git
- [ ] `.gitignore` includes `.env`
- [ ] Database access restricted by IP (if possible)
- [ ] Neon database password protected

### SumUp Security
- [ ] `SUMUP_API_KEY` is the secret key and only set in Netlify (never in code)
- [ ] Only staff can reach the till and SumUp payment routes
- [ ] Old Stripe keys removed from Netlify

### Application Security
- [ ] HTTPS enabled (required!)
- [ ] POS routes protected with authentication
- [ ] Admin routes protected with authentication
- [ ] CORS configured properly
- [ ] No sensitive data in logs
- [ ] Error messages don't expose system details

---

## 📊 Monitoring Setup

### SumUp Dashboard
- [ ] Bookmark: `https://me.sumup.com`
- [ ] Notifications enabled for payouts and chargebacks
- [ ] SumUp app installed on the manager's phone (optional)

### Application Monitoring
- [ ] Access to server logs (Netlify/Vercel dashboard)
- [ ] Error tracking enabled
- [ ] Uptime monitoring (optional: UptimeRobot, Pingdom)
- [ ] Performance monitoring (optional)

### Database Monitoring
- [ ] Neon dashboard bookmarked
- [ ] Query performance tracking enabled
- [ ] Storage usage monitored
- [ ] Connection pool monitored

---

## 👥 Staff Training

### Train All Staff On:
- [ ] How to login to POS (`/staff/pos`)
- [ ] Adding products to cart
- [ ] Linking customers via NFC (manual entry)
- [ ] Processing checkout
- [ ] Handling payment errors
- [ ] What to do if payment fails
- [ ] How to check order history
- [ ] Logging out when done

### Provide Documentation:
- [ ] POS quick reference guide
- [ ] Common error solutions
- [ ] Contact info for technical support
- [ ] Test card numbers (for training only!)

### Practice Sessions:
- [ ] Each staff member completes test transaction
- [ ] Practice linking VIP customer
- [ ] Practice handling declined card
- [ ] Know who to contact for issues

---

## 📞 Support Plan

### Emergency Contacts
- [ ] SumUp support: via the SumUp app or me.sumup.com
- [ ] Deployment platform support (Netlify/Vercel)
- [ ] Database support (Neon)
- [ ] Internal technical contact
- [ ] Backup contact

### Escalation Plan
- [ ] Level 1: Staff troubleshooting (5 min)
- [ ] Level 2: Manager/supervisor (15 min)
- [ ] Level 3: Technical admin (30 min)
- [ ] Level 4: SumUp support (1 hour)
- [ ] Level 5: Emergency shutdown (critical only)

### Emergency Procedures
- [ ] **Payment System Down:**
  - [ ] Switch to backup payment method
  - [ ] Contact technical support
  - [ ] Post notice for customers

- [ ] **Data Breach Suspected:**
  - [ ] Revoke the SumUp API key immediately (me.sumup.com → Developers)
  - [ ] Change all passwords
  - [ ] Contact SumUp support
  - [ ] Review access logs
  - [ ] Notify affected customers

---

## 🎯 Go-Live Plan

### Launch Schedule
- [ ] **Date:** _____________
- [ ] **Time:** _____________ (choose low-traffic time)
- [ ] **Staff on duty:** _____________
- [ ] **Technical support available:** _____________

### Day Before Launch
- [ ] Final code review
- [ ] All tests passing
- [ ] Webhooks tested
- [ ] Staff briefed
- [ ] Support team on standby
- [ ] Backup plan ready

### Launch Day
- [ ] Monitor the SumUp dashboard
- [ ] Watch application logs
- [ ] Staff ready to assist
- [ ] Process first real transaction
- [ ] Verify webhook delivery
- [ ] Check VIP points awarding
- [ ] Celebrate! 🎉

### First Week Post-Launch
- [ ] **Daily Tasks:**
  - [ ] Review all payments
  - [ ] Check for errors
  - [ ] Monitor webhook success rate
  - [ ] Review staff feedback
  - [ ] Respond to issues quickly

- [ ] **Weekly Review:**
  - [ ] Analyze payment success rate
  - [ ] Review VIP engagement
  - [ ] Identify bottlenecks
  - [ ] Plan improvements
  - [ ] Update documentation

---

## ✅ Final Sign-Off

### Technical Review
- [ ] **Reviewed by:** _____________
- [ ] **Date:** _____________
- [ ] All items checked: ☐ Yes ☐ No
- [ ] Issues noted: _____________
- [ ] Approved for launch: ☐ Yes ☐ No

### Business Review
- [ ] **Reviewed by:** _____________
- [ ] **Date:** _____________
- [ ] Staff trained: ☐ Yes ☐ No
- [ ] Support plan ready: ☐ Yes ☐ No
- [ ] Approved for launch: ☐ Yes ☐ No

---

## 🎉 Launch Approval

**I confirm that:**
- [ ] All checklist items are complete
- [ ] Testing was successful
- [ ] Staff are trained
- [ ] Monitoring is in place
- [ ] Support plan is ready
- [ ] Emergency procedures documented

**Authorized by:** _____________
**Date:** _____________
**Signature:** _____________

---

## 🚀 Ready to Go Live!

**When all boxes are checked, you're ready for production!**

**Good luck with your launch! 🎉💳✨**

---

## 📚 Reference Documents

- **Full Guide:** `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **SumUp Setup:** `SUMUP_SETUP_GUIDE.md`
- **NFC Setup:** `NFC_HARDWARE_SETUP.md`
- **POS Guide:** `POS_SYSTEM_README.md`
- **Quick Start:** `POS_QUICK_START.md`
