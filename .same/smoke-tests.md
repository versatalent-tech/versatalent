# 🧪 Smoke Tests - Refactoring Verification

**Phase 6: Testing & Verification**
**Date**: December 17, 2025

---

## Overview

These smoke tests verify that all critical functionality still works after the refactoring. Run these tests before deploying to production.

**Expected Result**: ✅ All tests should pass with ZERO regressions

---

## Pre-Test Setup

1. **Start development server**:
   ```bash
   cd versatalent
   bun run dev
   ```

2. **Open browser** to `http://localhost:3000`

3. **Open browser console** (F12) to monitor for errors

---

## Test Suite 1: Authentication & Authorization ✅

### Test 1.1: Admin Login
- [ ] Navigate to `/admin/login`
- [ ] Enter admin credentials from `.env.local`
- [ ] Click "Login"
- [ ] **Expected**: Redirected to admin dashboard
- [ ] **Verify**: No console errors

### Test 1.2: Staff Login
- [ ] Navigate to `/staff/login`
- [ ] Enter staff credentials from `.env.local`
- [ ] Click "Login"
- [ ] **Expected**: Redirected to staff POS
- [ ] **Verify**: No console errors

### Test 1.3: Admin Authentication (NEW - Phase 5)
- [ ] **Without logging in**, try to access `/admin/talents`
- [ ] **Expected**: Shows authentication UI or redirects
- [ ] **After logging in**, access `/admin/talents`
- [ ] **Expected**: Page loads successfully
- [ ] **Verify**: Admin-only routes are protected

### Test 1.4: Logout
- [ ] Click logout button
- [ ] **Expected**: Redirected to login page
- [ ] Try to access admin page
- [ ] **Expected**: Cannot access without re-login

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 2: Talent Management ✅

### Test 2.1: View Talents (Public)
- [ ] Navigate to `/talents`
- [ ] **Expected**: List of talents displays
- [ ] **Verify**: Images load correctly
- [ ] **Verify**: No console errors

### Test 2.2: Filter Talents
- [ ] Click on industry filter (e.g., "Music")
- [ ] **Expected**: Only music talents display
- [ ] **Verify**: Filter works correctly

### Test 2.3: Create Talent (Admin - Uses NEW validation!)
- [ ] Login as admin
- [ ] Navigate to `/admin/talents`
- [ ] Click "Add New Talent"
- [ ] **Fill in form**:
  - Name: Test Talent
  - Industry: Music
  - Profession: DJ
  - Bio: Test bio
  - Image URL: (use test image from quick test buttons)
- [ ] Click "Add Talent"
- [ ] **Expected**: Success message with user credentials dialog
- [ ] **Verify**: Credentials dialog shows email and password
- [ ] **Verify**: New talent appears in list

### Test 2.4: Validation Testing (NEW - Phase 5)
- [ ] Try to create talent **without required fields**
- [ ] **Expected**: Clear validation error messages
- [ ] **Verify**: Cannot submit invalid data
- [ ] **Verify**: Error messages are helpful

### Test 2.5: Edit Talent
- [ ] Click "Edit" on a talent
- [ ] Change profession
- [ ] Click "Save Changes"
- [ ] **Expected**: Success message
- [ ] **Verify**: Changes saved correctly

### Test 2.6: Delete Talent
- [ ] Create a test talent
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] **Expected**: Talent removed from list
- [ ] **Verify**: No console errors

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 3: Events System ✅

### Test 3.1: View Events (Public)
- [ ] Navigate to `/events`
- [ ] **Expected**: List of upcoming events
- [ ] **Verify**: Event cards display correctly
- [ ] **Verify**: Images load

### Test 3.2: Create Event (Admin)
- [ ] Login as admin
- [ ] Navigate to `/admin/events`
- [ ] Click "Create Event"
- [ ] **Fill in form**:
  - Title: Test Event
  - Description: Test description
  - Type: Performance
  - Date: Future date
  - Venue name: Test Venue
  - City: London
- [ ] Click "Create Event"
- [ ] **Expected**: Success message
- [ ] **Verify**: Event appears in list

### Test 3.3: Edit Event
- [ ] Click "Edit" on an event
- [ ] Change title
- [ ] Click "Save Changes"
- [ ] **Expected**: Success message
- [ ] **Verify**: Changes saved

### Test 3.4: Delete Event
- [ ] Create a test event
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] **Expected**: Event removed
- [ ] **Verify**: No errors

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 4: NFC System ✅

### Test 4.1: View Users (Admin)
- [ ] Login as admin
- [ ] Navigate to `/admin/nfc`
- [ ] Click "Users" tab
- [ ] **Expected**: List of users displays
- [ ] **Verify**: User data loads correctly

### Test 4.2: Register NFC Card
- [ ] Navigate to "Cards" tab
- [ ] Click "Register Card"
- [ ] **Fill in form**:
  - Card UID: TEST-CARD-001
  - Select user
  - Type: VIP
- [ ] Click "Register"
- [ ] **Expected**: Success message
- [ ] **Verify**: Card appears in list

### Test 4.3: Event Check-in
- [ ] Navigate to "Events" tab
- [ ] Create a test NFC event
- [ ] Navigate to "Check-ins" tab
- [ ] **Expected**: Can view check-in log
- [ ] **Verify**: No errors

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 5: VIP System ✅

### Test 5.1: View VIP Memberships (Admin)
- [ ] Login as admin
- [ ] Navigate to `/admin/vip`
- [ ] Click "Memberships" tab
- [ ] **Expected**: List of VIP members
- [ ] **Verify**: Points and tiers display correctly

### Test 5.2: Adjust Points
- [ ] Click "Adjust Points" on a user
- [ ] Add 100 points with reason
- [ ] Click "Apply"
- [ ] **Expected**: Success message
- [ ] **Verify**: Points updated correctly

### Test 5.3: View Tier Benefits
- [ ] Navigate to "Benefits" tab
- [ ] **Expected**: List of benefits per tier
- [ ] **Verify**: Benefits display correctly

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 6: POS System ✅

### Test 6.1: View Products (Staff)
- [ ] Login as staff
- [ ] Navigate to `/staff/pos`
- [ ] **Expected**: Product catalog displays
- [ ] **Verify**: Products and prices load

### Test 6.2: Create Order (Without Customer)
- [ ] Click on products to add to cart
- [ ] Click "Checkout"
- [ ] **Expected**: Stripe payment form appears
- [ ] **Note**: Don't complete payment (use test mode)
- [ ] **Verify**: Order flow works

### Test 6.3: Attach NFC Card to Order
- [ ] Create a new order
- [ ] Click "Attach NFC Card"
- [ ] Enter card UID or scan
- [ ] **Expected**: Customer identified
- [ ] **Verify**: Customer info displays

### Test 6.4: View Order History (Admin)
- [ ] Navigate to `/admin/pos/orders`
- [ ] **Expected**: List of orders
- [ ] **Verify**: Order details load correctly

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 7: Performance Verification 🚀

### Test 7.1: Page Load Speed
- [ ] Clear browser cache
- [ ] Navigate to `/admin/vip`
- [ ] **Open DevTools** → Network tab
- [ ] **Reload page**
- [ ] **Verify**: Components load progressively (dynamic imports working)
- [ ] **Check**: No massive JS bundles on initial load

### Test 7.2: Dynamic Imports Working
- [ ] Navigate to `/admin/vip`
- [ ] **Open DevTools** → Network tab
- [ ] **Look for**: Separate chunk files loading
- [ ] **Expected**: Multiple smaller JS files instead of one large file

### Test 7.3: Dashboard Analytics
- [ ] Navigate to `/dashboard`
- [ ] **Expected**: Dashboard loads
- [ ] **Verify**: Analytics charts load separately (lazy loaded)
- [ ] **Check console**: No errors

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 8: API Response Format (NEW - Phase 5) 🆕

### Test 8.1: Migrated Routes
- [ ] Open browser DevTools → Network tab
- [ ] Navigate to `/admin/talents`
- [ ] **Create a new talent** (trigger POST request)
- [ ] **Inspect Response**:
  - Should have `success: true` field
  - Should have `data` field
  - Should have `message` field (optional)
- [ ] **Expected**: Standardized response format

### Test 8.2: Error Responses
- [ ] Try to create talent **without authentication**
- [ ] **Inspect Response**:
  - Should have `success: false`
  - Should have `error` field
  - Should have appropriate status code (401)
- [ ] **Expected**: Standardized error format

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 9: Regression Testing ⚠️

### Test 9.1: Existing Features Still Work
- [ ] **Homepage** loads correctly
- [ ] **Public talent pages** load correctly
- [ ] **Public event pages** load correctly
- [ ] **Contact form** works (if implemented)
- [ ] **All navigation** works correctly

### Test 9.2: No Console Errors
- [ ] Navigate through all main pages
- [ ] **Check browser console** for errors
- [ ] **Expected**: No new errors from refactoring

### Test 9.3: No Broken Links
- [ ] Click all main navigation links
- [ ] **Expected**: No 404 errors
- [ ] **Verify**: All pages load

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Test Suite 10: Security Verification 🔐

### Test 10.1: Admin Routes Protected (NEW - Phase 5)
- [ ] Logout from admin
- [ ] Try to POST to `/api/talents` via DevTools/Postman
- [ ] **Expected**: 401 Unauthorized response
- [ ] **Verify**: Cannot create talents without auth

### Test 10.2: Password Sanitization
- [ ] Create a user
- [ ] **Inspect API response** in Network tab
- [ ] **Verify**: `password_hash` is NOT in response
- [ ] **Expected**: Only sanitized user data returned

### Test 10.3: Input Validation (NEW - Phase 5)
- [ ] Try to submit invalid email in talent creation
- [ ] **Expected**: Clear validation error
- [ ] Try to submit empty required fields
- [ ] **Expected**: Validation prevents submission

**Status**: ⬜ Not Started | ✅ Passed | ❌ Failed

---

## Summary Checklist

After completing all tests, verify:

- [ ] All 10 test suites completed
- [ ] No critical failures
- [ ] No new console errors
- [ ] Performance improvements visible (dynamic imports)
- [ ] Admin authentication working on protected routes
- [ ] Validation preventing invalid data
- [ ] API responses use standardized format

---

## Test Results

**Date Completed**: ___________
**Tester**: ___________
**Environment**: Local / Staging / Production

**Results**:
- ✅ Tests Passed: ___ / ___
- ❌ Tests Failed: ___ / ___
- ⚠️ Warnings: ___ / ___

**Notes**:
```
[Add any observations or issues found]
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Apply database migration 013
2. Deploy to staging
3. Run performance benchmarks
4. Deploy to production

### If Tests Fail ❌
1. Document failures
2. Fix issues
3. Re-run failed tests
4. Do NOT deploy until all tests pass

---

**Last Updated**: December 17, 2025
**Phase**: 6 - Testing & Verification
