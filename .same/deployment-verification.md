# 🚀 Deployment Verification Guide

**Phase 6: Testing & Verification**
**Date**: December 17, 2025

---

## Pre-Deployment Checklist

Before deploying to staging or production, ensure:

- [ ] All smoke tests passed (see `smoke-tests.md`)
- [ ] Automated test script passed (`scripts/test-refactoring.sh`)
- [ ] No critical linting errors
- [ ] Production build successful
- [ ] Database migration 013 ready to apply

---

## Step 1: Database Migration

### 1.1 Backup Current Database

**CRITICAL**: Always backup before migrations!

```sql
-- In Neon Console or your PostgreSQL client
-- Export current schema and data
```

**Neon Backup**:
1. Go to Neon Console → Your Database
2. Click "Backups" tab
3. Create manual backup: "pre-refactoring-migration-013"

### 1.2 Apply Migration 013

```sql
-- In Neon Console → SQL Editor
-- Copy and paste contents of migrations/013_performance_indexes.sql
-- Run the migration
```

**Expected output**: Multiple "CREATE INDEX" success messages

### 1.3 Verify Migration

```sql
-- Check indexes were created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('pos_orders', 'nfc_checkins', 'vip_points_log', 'events', 'talents')
ORDER BY tablename, indexname;
```

**Expected**: Should see 20+ new indexes

### 1.4 Update Statistics

```sql
-- Already included in migration, but can run manually
ANALYZE pos_orders;
ANALYZE nfc_checkins;
ANALYZE vip_points_log;
ANALYZE events;
ANALYZE talents;
```

---

## Step 2: Deploy to Staging

### 2.1 Update Environment Variables

Ensure staging `.env` has:
```bash
DATABASE_URL="your_staging_neon_url"
STRIPE_SECRET_KEY="sk_test_..."  # Use test keys for staging
STRIPE_PUBLISHABLE_KEY="pk_test_..."
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="staging_password"
STAFF_USERNAME="staff"
STAFF_PASSWORD="staging_password"
NEXT_PUBLIC_APP_URL="https://staging.yourdomain.com"
```

### 2.2 Build and Deploy

**For Netlify**:
```bash
cd versatalent
bun run build
netlify deploy --dir=.next
```

**Or configure automatic deployment**:
1. Connect GitHub repo to Netlify
2. Set build command: `bun run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy!

### 2.3 Verify Deployment

- [ ] Staging URL accessible
- [ ] Homepage loads correctly
- [ ] No 500 errors in logs

---

## Step 3: Performance Verification

### 3.1 Bundle Size Measurement

**Before Refactoring** (baseline):
- Need to check in deployment logs or analytics

**After Refactoring** (measure now):
1. Run build: `bun run build`
2. Check `.next/static/chunks` directory size
3. Look for:
   - Smaller main bundle (dynamic imports working)
   - Separate chunk files for admin pages
   - Lazy-loaded analytics chunks

**Expected Results**:
```
Main bundle: ~500KB (was ~700KB) = -200KB reduction
Admin chunks: 3-4 separate files (lazy loaded)
Dashboard analytics: Separate recharts chunk
```

### 3.2 Page Load Speed

**Tool**: Lighthouse (Chrome DevTools)

**Test Pages**:
1. **Homepage**: `https://staging.yourdomain.com`
2. **Admin VIP**: `https://staging.yourdomain.com/admin/vip`
3. **Dashboard**: `https://staging.yourdomain.com/dashboard`

**Metrics to Track**:
- **First Contentful Paint (FCP)**: Should improve by ~10-15%
- **Largest Contentful Paint (LCP)**: Should improve by ~10-20%
- **Time to Interactive (TTI)**: Should improve by ~15-25% (admin pages)
- **Total Blocking Time (TBT)**: Should decrease

**Run Lighthouse**:
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Performance" category
4. Click "Analyze page load"

### 3.3 Database Query Performance

**Test in Neon Console**:

```sql
-- Enable query timing
\timing on

-- Test 1: Purchase History (should be 3-5x faster)
EXPLAIN ANALYZE
SELECT o.*, u.name as customer_name
FROM pos_orders o
LEFT JOIN users u ON o.customer_user_id = u.id
WHERE o.customer_user_id = 'test-user-id'
AND o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 20;
-- Check: Should use idx_pos_orders_customer_status_created

-- Test 2: Upcoming Events (should be 2-3x faster)
EXPLAIN ANALYZE
SELECT *
FROM events
WHERE is_published = TRUE
AND status = 'upcoming'
ORDER BY start_time ASC
LIMIT 10;
-- Check: Should use idx_events_upcoming_published

-- Test 3: User Check-in History (should be 4-6x faster)
EXPLAIN ANALYZE
SELECT *
FROM nfc_checkins
WHERE user_id = 'test-user-id'
ORDER BY timestamp DESC
LIMIT 50;
-- Check: Should use idx_nfc_checkins_user_timestamp

-- Test 4: VIP Points Log (should be 3-4x faster)
EXPLAIN ANALYZE
SELECT *
FROM vip_points_log
WHERE user_id = 'test-user-id'
ORDER BY created_at DESC
LIMIT 50;
-- Check: Should use idx_vip_points_log_user_created
```

**What to Look For**:
- `Index Scan` (good) vs `Seq Scan` (slow)
- `rows=` should match actual rows needed
- Execution time should be low (< 50ms for simple queries)

### 3.4 Network Performance

**Use Browser DevTools → Network Tab**:

1. **Navigate to `/admin/vip`** (uses dynamic imports)
   - [ ] Verify: Multiple smaller JS chunks load
   - [ ] Verify: Main bundle is smaller
   - [ ] Check: Total transferred data

2. **Navigate to `/dashboard`** (analytics lazy loaded)
   - [ ] Verify: Recharts loads separately
   - [ ] Verify: Initial load is fast
   - [ ] Check: Lazy chunks only load when needed

**Expected Improvements**:
- Initial page load: 30-40% faster
- Main bundle size: ~200KB smaller
- Progressive loading visible

---

## Step 4: Functional Verification on Staging

### 4.1 Quick Smoke Test

Run critical flows on staging:
- [ ] Admin login works
- [ ] Create talent (test new validation!)
- [ ] Create event
- [ ] View public pages
- [ ] Check console for errors

### 4.2 Authentication Verification (NEW)

- [ ] Try to access `/api/talents` POST without auth
- [ ] **Expected**: 401 Unauthorized
- [ ] Login as admin
- [ ] Try to create talent
- [ ] **Expected**: Success with validation

### 4.3 API Response Format (NEW)

**Check Network tab**:
- [ ] API responses have `success` field
- [ ] Success responses have `data` field
- [ ] Error responses have `error` field
- [ ] Status codes are correct (200, 201, 400, 401, 500)

---

## Step 5: Performance Metrics Documentation

### 5.1 Record Baseline Metrics

Create a spreadsheet or document:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Bundle Size** | ___KB | ___KB | ___%  |
| **FCP** | ___ms | ___ms | ___ms |
| **LCP** | ___ms | ___ms | ___ms |
| **TTI** | ___ms | ___ms | ___ms |
| **Purchase Query** | ___ms | ___ms | ___x faster |
| **Events Query** | ___ms | ___ms | ___x faster |
| **Check-in Query** | ___ms | ___ms | ___x faster |

### 5.2 Expected Results

Based on refactoring:
- **Bundle size**: -15% to -25%
- **Page load**: -10% to -30% (admin pages more)
- **Database queries**: 2x to 6x faster
- **Time to Interactive**: -15% to -30%

---

## Step 6: Staging Sign-Off

### 6.1 Verification Checklist

- [ ] All smoke tests passed on staging
- [ ] Performance improvements verified
- [ ] No regressions found
- [ ] Database migration successful
- [ ] Authentication working correctly
- [ ] Validation preventing invalid data
- [ ] API responses standardized
- [ ] Dynamic imports working (check Network tab)

### 6.2 Stakeholder Review

- [ ] Demo new features to team
- [ ] Show performance improvements
- [ ] Get approval for production deployment

---

## Step 7: Production Deployment

### 7.1 Pre-Production Checklist

- [ ] Staging fully tested
- [ ] Performance verified
- [ ] Stakeholder approval received
- [ ] Database backup created
- [ ] Rollback plan ready

### 7.2 Production Migration

**CRITICAL**: Do this during low-traffic hours!

1. **Backup production database** (CRITICAL!)
2. **Apply migration 013** in production Neon Console
3. **Verify indexes created**
4. **Monitor for errors**

### 7.3 Production Deployment

**For Netlify**:
```bash
cd versatalent
bun run build
netlify deploy --prod
```

Or trigger automatic deployment from GitHub main branch.

### 7.4 Post-Deployment Monitoring

**First 5 minutes**:
- [ ] Check homepage loads
- [ ] Check admin panel accessible
- [ ] Monitor error logs
- [ ] Check Stripe webhooks working

**First hour**:
- [ ] Monitor server logs
- [ ] Check database performance
- [ ] Verify no user reports of issues
- [ ] Monitor error rates

**First 24 hours**:
- [ ] Review analytics
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Monitor error rates

---

## Step 8: Post-Deployment Verification

### 8.1 Production Smoke Tests

Run quick critical tests on production:
- [ ] Homepage loads
- [ ] Public pages load
- [ ] Admin login works
- [ ] Create test talent (then delete)
- [ ] No console errors

### 8.2 Performance Check

- [ ] Run Lighthouse on production
- [ ] Compare to baseline metrics
- [ ] Verify improvements realized

### 8.3 Database Performance

```sql
-- Check index usage in production
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
```

**Expected**: New indexes should show non-zero `idx_scan` counts

---

## Rollback Plan 🔄

**If issues are found in production**:

### Option 1: Quick Fix (if minor)
1. Fix the issue in code
2. Deploy patch immediately

### Option 2: Rollback Migration (if database issues)
```sql
-- Remove indexes (migration 013)
DROP INDEX IF EXISTS idx_pos_orders_customer_status_created;
DROP INDEX IF EXISTS idx_pos_orders_paid_created;
-- ... (drop all indexes from migration 013)
```

### Option 3: Full Rollback (if major issues)
1. Revert to previous Git commit
2. Redeploy previous version
3. Restore database backup if needed
4. Investigate issues offline

---

## Success Criteria ✅

**Deployment is successful if**:
- [ ] All critical features work
- [ ] No increase in error rates
- [ ] Performance improvements verified
- [ ] No user complaints
- [ ] Database queries performing well
- [ ] Bundle size reduced as expected

---

## Monitoring Dashboard (Recommended)

Set up monitoring for:
- **Error rates**: Should not increase
- **Response times**: Should decrease
- **Page load times**: Should improve
- **Database query times**: Should decrease
- **User complaints**: Should be zero

**Tools**:
- Netlify Analytics
- Neon Console monitoring
- Browser DevTools
- Lighthouse CI (for continuous monitoring)

---

## Final Checklist

- [ ] Migration 013 applied successfully
- [ ] Staging deployment successful
- [ ] Performance verified and documented
- [ ] All smoke tests passed
- [ ] Production deployment successful
- [ ] Post-deployment verification complete
- [ ] Monitoring in place

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Status**: ⬜ Staging | ⬜ Production | ⬜ Complete

**Notes**:
```
[Add deployment notes, metrics, and observations]
```

---

**Next Steps After Successful Deployment**:
1. Document actual performance improvements
2. Update README with new metrics
3. Share results with team
4. Plan migration of remaining API routes
5. Celebrate! 🎉

---

**Last Updated**: December 17, 2025
**Phase**: 6 - Testing & Verification
