# Admin Functions Review & Testing Guide

## Overview
This document reviews all admin panel functionality, authentication status, and provides a testing checklist to ensure everything works properly.

---

## Admin Dashboard
**Route**: `/admin`
**Authentication**: ✅ AdminAuthGuard
**Status**: Ready

### Features
- Dashboard overview with quick stats
- Links to all admin sections
- Logout functionality

---

## 1. Talent Management
**Route**: `/admin/talents`
**Authentication**: ✅ AdminAuthGuard
**API Endpoints**: `/api/talents`

### Features
✅ View all talents
✅ Create new talent with user account
✅ Edit talent details
✅ Delete talent
✅ Upload talent images
✅ Manage portfolio items
✅ Set featured status
✅ Toggle active/inactive status

### API Authentication
- GET `/api/talents` - ✅ Public (for frontend display)
- POST `/api/talents` - ✅ Admin Auth (withAdminAuth)
- PUT `/api/talents/[id]` - ✅ Admin Auth (withAdminAuth)
- DELETE `/api/talents/[id]` - ✅ Admin Auth (withAdminAuth)

### Testing Checklist
- [ ] Login as admin
- [ ] View talents list
- [ ] Create a new talent
- [ ] Upload talent image
- [ ] Edit talent details
- [ ] Add portfolio items
- [ ] Toggle featured status
- [ ] Delete a talent
- [ ] Verify user account is created with talent

---

## 2. Event Management
**Route**: `/admin/events`
**Authentication**: ✅ AdminAuthGuard
**API Endpoints**: `/api/events`

### Features
✅ View all events (upcoming, past, all)
✅ Create new event
✅ Edit event details
✅ Delete event
✅ Upload event images
✅ Set event type (performance, photoshoot, match, etc.)
✅ Set event status (upcoming, ongoing, completed, cancelled)
✅ Add venue information
✅ Set ticket URL and pricing
✅ Link events to talents
✅ Add tags and categories
✅ Toggle featured/published status

### API Authentication
- GET `/api/events` - ✅ Public (for frontend display)
- POST `/api/events` - ✅ Admin Auth (withAdminAuth) - FIXED ✅
- GET `/api/events/[id]` - ✅ Public
- PUT `/api/events/[id]` - ✅ Admin Auth (withAdminAuth) - FIXED ✅
- DELETE `/api/events/[id]` - ✅ Admin Auth (withAdminAuth) - FIXED ✅

### Testing Checklist
- [ ] Login as admin
- [ ] View events list
- [ ] Filter by status (upcoming/past/all)
- [ ] Create a new event
- [ ] Upload event image
- [ ] Set venue information
- [ ] Link event to talents
- [ ] Add tags
- [ ] Edit event details
- [ ] Toggle published status
- [ ] Delete an event

---

## 3. VIP Management
**Route**: `/admin/vip`
**Authentication**: ✅ AdminAuthGuard
**API Endpoints**: `/api/vip/*`, `/api/admin/tier-benefits`

### Features

#### VIP Memberships Tab
✅ View all VIP members
✅ See current tier (Silver/Gold/Black)
✅ View points balance and lifetime points
✅ Manually adjust points
✅ Change tier manually
✅ Change membership status (active/suspended/cancelled)
✅ View tier progression

#### Consumption Tracking Tab
✅ Record consumption transactions
✅ Auto-award points based on spending
✅ View consumption history
✅ Track revenue by customer

#### Tier Benefits Tab
✅ View benefits by tier
✅ Create new benefit
✅ Edit benefit details
✅ Toggle benefit active/inactive
✅ Delete benefit
✅ Benefits auto-populate in NFC card metadata

### API Authentication
- GET `/api/vip/memberships` - ✅ Public (for frontend)
- POST `/api/vip/memberships` - ✅ Public (auto-create on signup)
- PUT `/api/vip/memberships/[user_id]` - ✅ Admin only (updates NFC metadata)
- GET `/api/admin/tier-benefits` - ✅ Public (for frontend display)
- POST `/api/admin/tier-benefits` - ✅ Admin Auth (withAdminAuth) - FIXED ✅
- PUT `/api/admin/tier-benefits/[id]` - ✅ Admin Auth (withAdminAuth) - FIXED ✅
- PATCH `/api/admin/tier-benefits/[id]` - ✅ Admin Auth (withAdminAuth) - FIXED ✅
- DELETE `/api/admin/tier-benefits/[id]` - ✅ Admin Auth (withAdminAuth) - FIXED ✅

### Point System
- Event Check-in: 10 points (default)
- Consumption: 1 point per €3 spent (default)
- Manual Adjustment: Admin controlled

### Tier Thresholds
- **Silver**: 0+ points
- **Gold**: 500+ points
- **Black**: 1,750+ points

### Testing Checklist
- [ ] Login as admin
- [ ] View all VIP members
- [ ] Manually add points to a member
- [ ] Verify tier auto-upgrade at thresholds
- [ ] Create a consumption transaction
- [ ] Verify points awarded correctly
- [ ] Create a new tier benefit
- [ ] Edit a benefit
- [ ] Toggle benefit active status
- [ ] Delete a benefit
- [ ] Verify NFC card metadata updates

---

## 4. NFC Management
**Route**: `/admin/nfc`
**Authentication**: ✅ AdminAuthGuard
**API Endpoints**: `/api/nfc/*`

### Features

#### Users Tab
✅ View all users
✅ Create new user
✅ Edit user details
✅ Reset user password
✅ View user's NFC cards
✅ View user's check-in history

#### NFC Cards Tab
✅ View all NFC cards
✅ Create new card with auto-metadata
✅ Assign card to user
✅ Set card type (artist/vip/staff)
✅ Activate/deactivate cards
✅ Delete cards
✅ Auto-populate metadata with VIP tier and benefits

#### Events Tab (NFC Events)
✅ View all NFC events
✅ Create new event
✅ Edit event details
✅ Activate/deactivate events
✅ Delete events

#### Check-ins Tab
✅ View all check-ins
✅ Filter by date range
✅ Filter by source type
✅ View check-in details (user, event, card, metadata)
✅ Export check-in data

### NFC Card Metadata
Cards automatically include:
```json
{
  "membership_tier": "gold",
  "benefits": ["Benefit 1", "Benefit 2", ...]
}
```

### Testing Checklist
- [ ] Login as admin
- [ ] Create a new user
- [ ] Create an NFC card for user
- [ ] Verify metadata is auto-populated
- [ ] Create an NFC event
- [ ] Simulate a check-in
- [ ] View check-in logs
- [ ] Deactivate a card
- [ ] Delete a card

---

## 5. POS System
**Route**: `/admin/pos/products`
**Authentication**: ✅ AdminAuthGuard OR StaffAuth
**API Endpoints**: `/api/pos/*`

### Features

#### Products Management
✅ View all products
✅ Create new product
✅ Edit product details (name, price, category, stock)
✅ Toggle product active/inactive
✅ Delete product
✅ Track inventory levels
✅ Low stock indicators

#### Orders Management
**Route**: `/admin/pos/orders`
✅ View all orders
✅ Filter by status (pending/paid/cancelled)
✅ View order details with line items
✅ Cancel orders
✅ View customer information
✅ Stripe payment integration

### API Authentication
- GET `/api/pos/products` - ✅ POS Auth (staff or admin) - FIXED ✅
- POST `/api/pos/products` - ✅ POS Auth (staff or admin) - FIXED ✅
- PUT `/api/pos/products/[id]` - ✅ POS Auth (staff or admin) - FIXED ✅
- DELETE `/api/pos/products/[id]` - ✅ POS Auth (staff or admin) - FIXED ✅
- GET `/api/pos/orders` - ✅ POS Auth (staff or admin)
- POST `/api/pos/orders` - ✅ POS Auth (staff or admin)

### Stripe Integration
✅ Payment intent creation
✅ Payment success webhook
✅ Payment failure handling
✅ Customer tracking
✅ Purchase history

### Testing Checklist
- [ ] Login as admin
- [ ] Create a new product
- [ ] Set product price and stock
- [ ] Edit product details
- [ ] Toggle product active status
- [ ] View orders list
- [ ] Create test order via staff POS
- [ ] Verify Stripe payment
- [ ] View order details

---

## 6. Instagram Feed
**Route**: `/admin/instagram`
**Authentication**: ✅ AdminAuthGuard
**API Endpoints**: `/api/instagram/*`

### Features
✅ Configure Instagram access token
✅ Test Instagram connection
✅ View feed preview
✅ Refresh feed data
✅ Configure feed display settings

### Testing Checklist
- [ ] Login as admin
- [ ] Add Instagram access token
- [ ] Test connection
- [ ] View feed preview
- [ ] Verify feed displays on homepage

---

## 7. Analytics Dashboard
**Route**: `/dashboard`
**Authentication**: ⚠️ Public (consider adding auth)
**API Endpoints**: `/api/analytics/*`

### Features
✅ Real-time visitor tracking
✅ Page view statistics
✅ Popular pages analysis
✅ Visitor geographic data
✅ Device/browser statistics
✅ Event tracking
✅ Custom event logging

### Testing Checklist
- [ ] View analytics dashboard
- [ ] Check real-time visitor count
- [ ] View popular pages
- [ ] Verify event tracking works

---

## Authentication Summary

### ✅ SECURED (Admin Auth Required)
- Talent create/edit/delete
- Event create/edit/delete - FIXED ✅
- VIP tier benefits create/edit/delete - FIXED ✅
- VIP membership manual updates
- NFC card management
- User management

### ✅ SECURED (Staff OR Admin Auth)
- POS products management - FIXED ✅
- POS orders management
- Staff POS interface

### ⚠️ PUBLIC (Consider if appropriate)
- Analytics dashboard (might want to add auth)
- Instagram feed configuration (read-only endpoints)

---

## Recent Authentication Fixes

### Version 184: Admin Login Cookie Fix
- Fixed admin login to set BOTH `admin_session` and `admin_auth` cookies
- Fixed admin logout to clear BOTH cookies
- Resolved 401 errors when creating talents

### Version 185: Staff POS Authentication
- Updated POS auth to accept BOTH staff and admin sessions
- Staff can now access POS independently
- Staff login sets `staff_session` and `staff_auth` cookies
- Staff logout clears both cookies

### Version 186: Events & Benefits API Security
- Added admin authentication to Events API (POST/PUT/DELETE)
- Added admin authentication to Tier Benefits API (POST/PUT/PATCH/DELETE)
- GET endpoints remain public for frontend display
- NFC metadata auto-updates on tier changes

---

## Admin Credentials

### Environment Variables
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
```

### Creating Admin Users
Admins are created through environment variables or database seeding, not through the UI.

---

## Next Steps

1. **Test All Functions**: Go through each testing checklist
2. **Verify Authentication**: Try accessing protected routes without login
3. **Test Data Flow**: Create → Edit → Delete for each content type
4. **Check Integrations**:
   - NFC metadata updates with VIP tiers
   - Stripe payments in POS
   - Instagram feed display
5. **Performance Testing**: Load test with multiple concurrent users

---

## Known Issues & Limitations

1. **Analytics Dashboard**: Currently public, no authentication
2. **Session Duration**: 24 hours (configurable in auth files)
3. **Password Reset**: Only available for users with email (talents get auto-generated credentials)

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review API responses for specific error details
- Check network tab for authentication headers
- Verify cookies are set correctly (`admin_auth`, `staff_auth`)
