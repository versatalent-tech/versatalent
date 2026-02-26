# Staff POS System - End-to-End Testing Guide

## 🎯 Testing Overview

This guide walks you through testing the complete staff POS flow from login to checkout with stock management and loyalty points.

---

## 📋 Pre-Testing Checklist

### 1. Database Migration

Ensure the inventory management migration has been run:

```bash
psql $DATABASE_URL -f migrations/011_inventory_management.sql
```

Verify tables exist:
```sql
\d inventory_movements
\d products  -- Should have low_stock_threshold column
```

### 2. Create Test Staff User

```sql
-- Create staff user with password 'test123'
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Test Staff',
  'staff@test.com',
  -- bcrypt hash for 'test123'
  '$2a$10$rN3qK5pq5ZQ5qP5qP5qP5ueK5pq5ZQ5qP5qP5qP5qP5qP5qP5qP5q',
  'staff'
);
```

**Generate your own bcrypt hash:**
```javascript
// In Node.js or browser console
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your_password', 10);
console.log(hash);
```

### 3. Create Test Products with Stock

```sql
-- Insert test products
INSERT INTO products (name, description, price_cents, currency, category, stock_quantity, low_stock_threshold, is_active)
VALUES
  ('Espresso', 'Double shot espresso', 250, 'EUR', 'Drinks', 50, 10, true),
  ('Cappuccino', 'Classic cappuccino', 350, 'EUR', 'Drinks', 30, 10, true),
  ('Croissant', 'Butter croissant', 200, 'EUR', 'Food', 20, 5, true),
  ('Sandwich', 'Club sandwich', 550, 'EUR', 'Food', 3, 5, true),  -- Low stock
  ('Water', 'Bottled water', 150, 'EUR', 'Drinks', 0, 10, true);  -- Out of stock
```

### 4. Create Test VIP Customer (Optional)

```sql
-- Create VIP customer
INSERT INTO users (name, email, role)
VALUES ('VIP Customer', 'vip@test.com', 'vip')
RETURNING id;

-- Note the returned ID and use it below
INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
VALUES ('USER_ID_HERE', 'gold', 500, 1500, 'active');

-- Create NFC card for the customer
INSERT INTO nfc_cards (card_uid, user_id, type, is_active)
VALUES ('TEST:11:22:33:44:55', 'USER_ID_HERE', 'vip', true);
```

### 5. Configure VIP Points Rule

```sql
-- Set points rule: 1 point per €1 spent
INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
VALUES ('consumption', 1, 'euro', true)
ON CONFLICT (action_type) DO UPDATE SET points_per_unit = 1, is_active = true;
```

---

## 🧪 Test Cases

### Test 1: Staff Login ✅

**Steps:**
1. Navigate to `/staff/login`
2. Enter credentials:
   - Email: `staff@test.com`
   - Password: `test123`
3. Click "Sign In"

**Expected Result:**
- ✅ Login successful
- ✅ Automatically redirected to `/staff/pos`
- ✅ Session cookie created (`staff_session`)
- ✅ Header shows "Staff POS" with logout button

**Failure Scenarios:**
- ❌ Invalid credentials → Error: "Invalid email or password"
- ❌ Non-staff role → Error: "Access denied. Staff credentials required."
- ❌ Session expired → Redirected to `/staff/login`

---

### Test 2: Products Load with Stock Indicators ✅

**Steps:**
1. After login, observe the products grid
2. Check stock badges on each product

**Expected Result:**
- ✅ All active products displayed
- ✅ Products show stock quantity badge
- ✅ Stock status indicators:
  - 🟢 Green badge: In stock (50 available)
  - 🟡 Yellow badge with ⚠️: Low stock (3 available)
  - 🔴 Red badge with ❌: Out of stock (0 available)
- ✅ Out of stock products are slightly grayed out

**Check:**
- Espresso: Green badge "50"
- Sandwich: Yellow badge "3 ⚠️"
- Water: Red badge "0 ❌"

---

### Test 3: Cart Operations ✅

**Steps:**
1. Click on "Espresso" to add to cart
2. Click on "Cappuccino" to add to cart
3. Use +/- buttons to adjust quantity
4. Try adding more than available stock
5. Try adding out-of-stock item (Water)
6. Remove an item using trash icon
7. Click "Clear Cart"

**Expected Result:**
- ✅ Products added to cart on click
- ✅ Quantity increases with + button
- ✅ Quantity decreases with - button
- ✅ Item removed when quantity reaches 0
- ✅ Error when exceeding stock: "Only X available"
- ✅ Error when adding out-of-stock: "Item is out of stock"
- ✅ All items removed on "Clear Cart"
- ✅ Total updates in real-time

---

### Test 4: NFC Customer Linking (Optional) ✅

**Prerequisites:** NFC card registered (see Pre-Testing Checklist #4)

**Steps:**
1. Add items to cart
2. Click "Scan NFC Card" button
3. Scan card with UID: `TEST:11:22:33:44:55`

**Expected Result:**
- ✅ Customer info appears in green box
- ✅ Shows customer name and email
- ✅ Shows VIP tier badge (GOLD VIP)
- ✅ Shows points balance (500 points)
- ✅ Success message: "Customer linked: VIP Customer (GOLD)"
- ✅ Can unlink customer with X button

**Note:** Without physical NFC reader, you can test the API directly:
```bash
# Create an order first, then call:
curl -X POST http://localhost:3000/api/staff/pos/nfc-attach \
  -H "Content-Type: application/json" \
  -d '{
    "card_uid": "TEST:11:22:33:44:55",
    "pos_order_id": "ORDER_ID_HERE"
  }'
```

---

### Test 5: Checkout with Stock Validation ✅

**Test 5A: Sufficient Stock**

**Steps:**
1. Add 2x Espresso (stock: 50)
2. Click "Checkout"

**Expected Result:**
- ✅ Payment dialog opens
- ✅ Shows total: €5.00
- ✅ No stock errors

**Test 5B: Insufficient Stock**

**Steps:**
1. Add 4x Sandwich (stock: 3)
2. Click "Checkout"

**Expected Result:**
- ✅ Checkout blocked
- ❌ Error: "Only 3 Sandwich available"
- ✅ Payment dialog does NOT open

**Test 5C: Out of Stock**

**Steps:**
1. Try adding Water (stock: 0)

**Expected Result:**
- ❌ Error: "Water is out of stock"
- ✅ Item NOT added to cart

---

### Test 6: Payment Processing (Development Mode) ✅

**Note:** Without Stripe configured, the system marks orders as paid immediately.

**Steps:**
1. Add 2x Espresso + 1x Croissant
2. Click "Checkout"
3. If Stripe is not configured, order is auto-paid

**Expected Result:**
- ✅ Success message: "Payment successful! Order complete."
- ✅ Cart cleared
- ✅ Customer unlinked (if was linked)
- ✅ Can make another sale

---

### Test 7: Payment with Stripe (Production) ✅

**Prerequisites:** Stripe configured in `.env.local`

**Steps:**
1. Add items to cart
2. Link VIP customer (optional)
3. Click "Checkout"
4. Enter test card details:
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

**Expected Result:**
- ✅ Payment dialog shows Stripe form
- ✅ Can enter card details
- ✅ On submit: "Processing..." shown
- ✅ On success:
  - Success message with points (if VIP linked)
  - Cart cleared
  - Products refreshed with updated stock

**Test Card Scenarios:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

---

### Test 8: Stock Deduction After Payment ✅

**Steps:**
1. Note current stock of Espresso (50)
2. Purchase 3x Espresso
3. Complete payment
4. Refresh page or check database

**Expected Result:**
- ✅ Stock reduced: 50 → 47
- ✅ Inventory movement created:
  ```sql
  SELECT * FROM inventory_movements
  WHERE reason = 'pos_sale'
  ORDER BY created_at DESC LIMIT 1;
  ```
- ✅ Shows: change_amount = -3, related_order_id set

**Verify in Database:**
```sql
-- Check product stock
SELECT name, stock_quantity FROM products WHERE name = 'Espresso';

-- Check inventory movement
SELECT * FROM inventory_movements
WHERE product_id = (SELECT id FROM products WHERE name = 'Espresso')
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 9: Loyalty Points Award ✅

**Prerequisites:** VIP customer linked, VIP points rule configured

**Steps:**
1. Link VIP customer (500 points)
2. Add items totaling €10.00
3. Complete payment

**Expected Result:**
- ✅ Success message includes: "10 points awarded!"
- ✅ VIP membership updated:
  ```sql
  SELECT points_balance FROM vip_memberships
  WHERE user_id = 'VIP_CUSTOMER_ID';
  -- Should be: 510 (500 + 10)
  ```
- ✅ VIP consumption created:
  ```sql
  SELECT * FROM vip_consumptions
  WHERE user_id = 'VIP_CUSTOMER_ID'
  AND source = 'pos'
  ORDER BY created_at DESC LIMIT 1;
  ```
- ✅ Points log entry created:
  ```sql
  SELECT * FROM vip_points_log
  WHERE user_id = 'VIP_CUSTOMER_ID'
  AND source = 'consumption_pos'
  ORDER BY created_at DESC LIMIT 1;
  ```

---

### Test 10: Order Cancellation & Stock Restoration ✅

**Prerequisites:** Admin access to cancel orders

**Steps:**
1. Make a purchase (e.g., 2x Cappuccino)
2. Note stock after purchase
3. Cancel the order via API:
   ```bash
   curl -X PUT http://localhost:3000/api/pos/orders/ORDER_ID \
     -H "Content-Type: application/json" \
     -d '{"status": "cancelled"}'
   ```
4. Check stock

**Expected Result:**
- ✅ Order status → 'cancelled'
- ✅ Stock restored (back to original)
- ✅ Inventory movement created with reason = 'return'
- ✅ Points reversed (if customer was linked)

**Verify:**
```sql
-- Check stock restored
SELECT name, stock_quantity FROM products WHERE name = 'Cappuccino';

-- Check return movement
SELECT * FROM inventory_movements
WHERE reason = 'return'
ORDER BY created_at DESC LIMIT 1;

-- Check points reversal (if VIP)
SELECT * FROM vip_points_log
WHERE source = 'manual_adjust'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 11: Low Stock Warning ✅

**Steps:**
1. Purchase items until Sandwich stock reaches low threshold (≤5)
2. Observe product display

**Expected Result:**
- ✅ Yellow badge appears with ⚠️
- ✅ Badge shows remaining quantity
- ✅ Product still purchasable

---

### Test 12: Multiple Orders in Session ✅

**Steps:**
1. Complete first order
2. Immediately start second order
3. Add different products
4. Complete second order

**Expected Result:**
- ✅ First order completes successfully
- ✅ Cart clears after first order
- ✅ Can add new items for second order
- ✅ Second order creates separate database record
- ✅ Stock deducted correctly for both orders
- ✅ Each order gets unique ID

---

### Test 13: Logout and Re-Login ✅

**Steps:**
1. Click logout button in header
2. Confirm redirected to login page
3. Try accessing `/staff/pos` directly
4. Login again

**Expected Result:**
- ✅ Logout clears session cookie
- ✅ Redirected to `/staff/login`
- ✅ Cannot access `/staff/pos` without login
- ✅ Can login again successfully
- ✅ Session restored after re-login

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch products"

**Cause:** Database connection error or products table empty

**Solution:**
```sql
-- Check products exist
SELECT COUNT(*) FROM products;

-- Check database connection
SELECT NOW();
```

### Issue: "Insufficient stock" but stock shows available

**Cause:** Cart quantity exceeds available stock

**Solution:**
- Clear cart
- Refresh page
- Check actual stock in database

### Issue: Points not awarded

**Possible Causes:**
1. Customer not linked to order
2. VIP membership not active
3. Points rule not configured

**Check:**
```sql
-- Verify VIP membership
SELECT * FROM vip_memberships WHERE user_id = 'USER_ID';

-- Verify points rule
SELECT * FROM vip_point_rules WHERE is_active = true;
```

### Issue: Stock not deducting

**Possible Causes:**
1. Migration not run
2. Order status not 'paid'
3. Error in inventory repository

**Check:**
```sql
-- Verify inventory_movements table exists
\d inventory_movements

-- Check recent orders
SELECT id, status FROM pos_orders ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 Database Verification Queries

### Check Recent Orders
```sql
SELECT
  o.id,
  o.status,
  o.total_cents / 100.0 AS total_euros,
  u.name AS customer_name,
  o.created_at
FROM pos_orders o
LEFT JOIN users u ON u.id = o.customer_user_id
ORDER BY o.created_at DESC
LIMIT 10;
```

### Check Inventory Movements
```sql
SELECT
  im.created_at,
  p.name AS product,
  im.change_amount,
  im.reason,
  u.name AS staff_name
FROM inventory_movements im
LEFT JOIN products p ON p.id = im.product_id
LEFT JOIN users u ON u.id = im.staff_user_id
ORDER BY im.created_at DESC
LIMIT 20;
```

### Check VIP Points Activity
```sql
SELECT
  vpl.created_at,
  u.name,
  vpl.source,
  vpl.delta_points,
  vpl.balance_after
FROM vip_points_log vpl
JOIN users u ON u.id = vpl.user_id
WHERE vpl.source IN ('consumption_pos', 'manual_adjust')
ORDER BY vpl.created_at DESC
LIMIT 10;
```

### Check Product Stock Levels
```sql
SELECT
  name,
  stock_quantity,
  low_stock_threshold,
  CASE
    WHEN stock_quantity = 0 THEN 'OUT OF STOCK'
    WHEN stock_quantity <= COALESCE(low_stock_threshold, 5) THEN 'LOW STOCK'
    ELSE 'IN STOCK'
  END AS status
FROM products
WHERE is_active = true
ORDER BY stock_quantity ASC;
```

---

## ✅ Testing Completion Checklist

- [ ] Staff can login successfully
- [ ] Products load with correct stock indicators
- [ ] Cart operations work (add/remove/adjust)
- [ ] Stock validation prevents over-ordering
- [ ] Out-of-stock items cannot be added
- [ ] NFC customer linking works (if applicable)
- [ ] Checkout creates order
- [ ] Payment processing works
- [ ] Stock deducts after payment
- [ ] Inventory movements recorded
- [ ] Loyalty points awarded correctly
- [ ] Order cancellation restores stock
- [ ] Points reversed on cancellation
- [ ] Low stock warnings appear
- [ ] Multiple orders in sequence work
- [ ] Logout clears session
- [ ] Cannot access POS without auth

---

## 🎓 Next Steps After Testing

1. **Performance Testing**
   - Test with 100+ products
   - Test concurrent orders
   - Monitor database query performance

2. **Security Testing**
   - Try accessing POS without login
   - Test SQL injection prevention
   - Verify session timeout

3. **User Acceptance Testing**
   - Train actual staff members
   - Gather feedback on UI/UX
   - Document common workflows

4. **Production Deployment**
   - Run migration on production database
   - Create production staff accounts
   - Configure production Stripe keys
   - Set up monitoring and alerts

---

**Happy Testing! 🚀**

For issues or questions, refer to `STAFF_POS_GUIDE.md` or contact the system administrator.
