# VersaTalent Staff POS System - Complete Guide

## Overview

The VersaTalent Staff POS (Point of Sale) system is a comprehensive solution that integrates:
- **Staff-only authentication** with automatic redirect
- **Real-time inventory management** with stock tracking
- **NFC card integration** for instant customer linking
- **VIP loyalty points** automatically awarded on purchases
- **Stripe payment processing** with complete order lifecycle
- **Admin tools** for product, stock, and order management

---

## Table of Contents

1. [Staff Authentication](#staff-authentication)
2. [Accessing the POS](#accessing-the-pos)
3. [Using the POS System](#using-the-pos-system)
4. [NFC Customer Linking](#nfc-customer-linking)
5. [Payment Processing](#payment-processing)
6. [Inventory Management](#inventory-management)
7. [Loyalty Points System](#loyalty-points-system)
8. [Admin Tools](#admin-tools)
9. [API Reference](#api-reference)
10. [Database Migrations](#database-migrations)
11. [Troubleshooting](#troubleshooting)

---

## Staff Authentication

### Creating Staff Accounts

Staff accounts must have `role = 'staff'` or `role = 'admin'` in the database.

**Create a staff user:**
```sql
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'John Doe',
  'john@versatalent.com',
  -- Use bcrypt to hash password
  '$2a$10$...',
  'staff'
);
```

### Staff Login Flow

1. Navigate to `/staff/login`
2. Enter email and password
3. System validates credentials
4. Checks if user has `staff` or `admin` role
5. Creates secure session cookie (`staff_session`)
6. **Automatically redirects** to `/staff/pos`

**Session Details:**
- Duration: 24 hours
- Cookie: `staff_session` (httpOnly, secure in production)
- Contains: userId, role, name, email, expiration

### API Endpoints

**Login:**
```bash
POST /api/staff/login
Content-Type: application/json

{
  "email": "staff@versatalent.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "staff@versatalent.com",
    "role": "staff"
  }
}
```

**Logout:**
```bash
POST /api/staff/logout
```

**Auth Check:**
```bash
GET /api/staff/auth/check
```

---

## Accessing the POS

### Staff POS Page

**URL:** `/staff/pos`

**Requirements:**
- Must be logged in as staff or admin
- Active session required
- Automatically redirects to login if unauthorized

**Features:**
- Product browsing with search and category filters
- Shopping cart with quantity management
- NFC customer linking
- Stripe payment integration
- Real-time stock indicators
- VIP points display

---

## Using the POS System

### Creating an Order

1. **Browse Products**
   - View all active products
   - Filter by category
   - Search by name
   - See real-time stock levels

2. **Add to Cart**
   - Click on product to add
   - Adjust quantity with +/- buttons
   - Remove items if needed
   - Cart shows real-time total

3. **Link Customer (Optional)**
   - Scan NFC card
   - System automatically attaches customer to order
   - VIP info displayed (tier, points balance)

4. **Checkout**
   - Click "Checkout" button
   - System creates order with status: `pending`
   - **Stock validation** runs automatically
   - If insufficient stock → Error shown
   - If stock available → Payment dialog opens

5. **Process Payment**
   - Enter payment details (Stripe)
   - On success:
     - Order status → `paid`
     - Stock automatically deducted
     - Inventory movements recorded
     - VIP points awarded (if customer linked)
   - On failure:
     - Order status → `failed`
     - No stock deduction
     - No points awarded

### Stock Availability

The system automatically checks stock before allowing checkout:

```typescript
// Example: Order with 2 items
{
  "items": [
    { "product_id": "abc123", "quantity": 3 },
    { "product_id": "def456", "quantity": 1 }
  ]
}
```

**System checks:**
- Product ABC123: Has 3+ in stock?
- Product DEF456: Has 1+ in stock?
- If ANY item has insufficient stock → Checkout blocked
- Clear error message shows which items are low

---

## NFC Customer Linking

### How It Works

1. Staff scans customer's NFC card
2. Card UID detected
3. Automatic API call to `/api/staff/pos/nfc-attach`
4. System looks up card in database
5. Retrieves user and VIP membership
6. Attaches customer to current order
7. Displays VIP info on screen

**No manual steps required!** Just scan the card.

### NFC Attach API

**Endpoint:**
```bash
POST /api/staff/pos/nfc-attach
Content-Type: application/json

{
  "card_uid": "04:6B:3E:A2:4F:5D:80",
  "pos_order_id": "order-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "customer": {
    "id": "user-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "vip": {
      "tier": "gold",
      "points_balance": 1250,
      "lifetime_points": 5400
    }
  }
}
```

### Validation

The system validates:
- ✅ Card exists in database
- ✅ Card is active (`is_active = true`)
- ✅ User exists
- ✅ VIP membership is active (if applicable)
- ✅ Order is in `pending` status

---

## Payment Processing

### Stripe Integration

**When staff clicks "Checkout":**

1. Order created with `status = 'pending'`
2. Stripe Payment Intent created
3. Payment dialog shown to customer
4. Customer enters card details
5. Stripe processes payment

**On successful payment:**
- Payment Intent status → `succeeded`
- Webhook received (if configured)
- Order status → `paid`
- **Inventory deducted automatically**
- **VIP points awarded automatically**

**On failed payment:**
- Payment Intent status → `failed`
- Order status → `failed`
- No inventory changes
- No points awarded

### Payment Workflow

```
Cart Ready
   ↓
Create Order (pending)
   ↓
Create Payment Intent
   ↓
Customer Pays
   ↓
Payment Success?
   ├─ YES → Update Order (paid)
   │         ├─ Deduct Stock
   │         ├─ Record Inventory Movement
   │         └─ Award VIP Points
   │
   └─ NO → Update Order (failed)
             └─ No changes
```

---

## Inventory Management

### Automatic Stock Deduction

When an order is marked as `paid`, the system:

1. Gets all order items
2. For each item:
   - Deducts quantity from `products.stock_quantity`
   - Creates `inventory_movements` record
   - Records staff user who processed the sale
   - Links movement to the order

**Example:**
```javascript
// Order has 2 items
Items: [
  { product_id: 'abc', quantity: 3 },
  { product_id: 'def', quantity: 1 }
]

// After payment success:
// Product ABC: stock_quantity -= 3
// Product DEF: stock_quantity -= 1

// Inventory movements created:
[
  {
    product_id: 'abc',
    change_amount: -3,
    reason: 'pos_sale',
    related_order_id: 'order-uuid',
    staff_user_id: 'staff-uuid'
  },
  {
    product_id: 'def',
    change_amount: -1,
    reason: 'pos_sale',
    related_order_id: 'order-uuid',
    staff_user_id: 'staff-uuid'
  }
]
```

### Stock Restoration

When an order is cancelled or refunded:

1. System retrieves original order items
2. For each item:
   - Adds quantity back to stock
   - Creates `inventory_movements` record with `reason = 'return'`
   - Links to original order

### Low Stock Alerts

Products have a `low_stock_threshold` field (default: 5).

**Query low stock products:**
```sql
SELECT * FROM products
WHERE is_active = true
AND stock_quantity <= COALESCE(low_stock_threshold, 5)
ORDER BY stock_quantity ASC;
```

### Manual Stock Adjustments

Staff/admins can manually adjust stock:

**API Endpoint:**
```bash
POST /api/admin/inventory/adjust
Content-Type: application/json

{
  "product_id": "uuid",
  "change_amount": 50,  // Positive = add, Negative = remove
  "reason": "restock",  // 'restock', 'manual_adjustment', 'damage', 'theft'
  "notes": "Weekly restock from supplier"
}
```

### Inventory Movement Reasons

| Reason | Description | Stock Change |
|--------|-------------|--------------|
| `pos_sale` | POS order payment | Negative |
| `return` | Order cancelled/refunded | Positive |
| `restock` | New inventory received | Positive |
| `manual_adjustment` | Staff correction | Either |
| `damage` | Damaged goods removed | Negative |
| `theft` | Theft/loss | Negative |

---

## Loyalty Points System

### How Points are Awarded

When a POS order is paid **AND** has a linked customer:

1. System retrieves VIP membership
2. Gets active points rule for POS consumption
3. Calculates points based on order total
4. Updates VIP membership:
   - `points_balance` increased
   - `lifetime_points` increased
5. Creates `vip_consumptions` record
6. Logs points transaction in `vip_points_log`

### Points Calculation

**Default rule:** 1 point per €1 spent

**Example:**
```javascript
Order Total: €45.50
Points Rule: 1 point per €1
Points Awarded: 45 points (rounded down)
```

**Configurable via `vip_point_rules` table:**
```sql
SELECT * FROM vip_point_rules
WHERE action_type IN ('consumption', 'pos_consumption')
AND is_active = true;
```

### Points Reversal

If an order is cancelled or refunded:

1. System finds original points award
2. Deducts points from VIP balance
3. Creates reversal log entry
4. Points cannot go below 0

**Example:**
```javascript
Original Order: €45.00 → +45 points
Order Cancelled: €45.00 → -45 points
New Balance: Previous balance - 45
```

### Idempotency

The system prevents duplicate points awards:

- Checks if points already awarded for this order
- Uses order ID as reference in `vip_points_log`
- If points already exist → Skip award
- Ensures same order can't award points twice

### VIP Consumption Record

```sql
-- Created on every paid POS order with customer
INSERT INTO vip_consumptions (
  user_id,
  amount,      -- Order total in euros
  currency,    -- 'EUR'
  description, -- 'POS Order #abc12345'
  source       -- 'pos' (new source type)
)
```

---

## Admin Tools

### Product Management

**Location:** `/admin/pos/products`

**Features:**
- View all products (active and inactive)
- Create new products
- Edit product details
- Set prices and stock
- Configure low stock threshold
- Activate/deactivate products
- Categorize products

**Creating a Product:**
```typescript
{
  name: "Espresso",
  description: "Double shot espresso",
  price_cents: 250,  // €2.50
  category: "Drinks",
  stock_quantity: 100,
  low_stock_threshold: 10,
  is_active: true
}
```

### Order History

**Query all orders:**
```bash
GET /api/pos/orders?limit=50&offset=0

# Filter by status
GET /api/pos/orders?status=paid&limit=100

# Filter by staff
GET /api/pos/orders?staffUserId=uuid

# Filter by customer
GET /api/pos/orders?customerUserId=uuid

# Get status counts
GET /api/pos/orders?counts=true
```

### Inventory Logs

**View inventory movements:**
```bash
GET /api/admin/inventory/movements?product_id=uuid&limit=50
```

**Response:**
```json
[
  {
    "id": "uuid",
    "product_id": "uuid",
    "product_name": "Espresso",
    "change_amount": -2,
    "reason": "pos_sale",
    "staff_name": "John Doe",
    "related_order_id": "order-uuid",
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

### Low Stock Report

```bash
GET /api/admin/inventory/low-stock
```

---

## API Reference

### Authentication APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/staff/login` | POST | None | Staff login |
| `/api/staff/logout` | POST | Staff | Logout staff |
| `/api/staff/auth/check` | GET | Staff | Check session |

### POS APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/pos/products` | GET | Staff | List products |
| `/api/pos/products` | POST | Staff | Create product |
| `/api/pos/products/:id` | PUT | Staff | Update product |
| `/api/pos/products/:id` | DELETE | Staff | Delete product |
| `/api/pos/orders` | GET | Staff | List orders |
| `/api/pos/orders` | POST | Staff | Create order |
| `/api/pos/orders/:id` | GET | Staff | Get order details |
| `/api/pos/orders/:id` | PUT | Staff | Update order status |
| `/api/staff/pos/nfc-attach` | POST | Staff | Attach NFC to order |

### Inventory APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/inventory/movements` | GET | Staff | List movements |
| `/api/admin/inventory/adjust` | POST | Admin | Manual adjustment |
| `/api/admin/inventory/low-stock` | GET | Staff | Low stock report |

---

## Database Migrations

### Run Migration

```bash
# Connect to your Neon database
psql $DATABASE_URL

# Run the migration
\i migrations/011_inventory_management.sql
```

### What Gets Created

1. **`inventory_movements` table**
   - Audit trail for all stock changes
   - Links to products, orders, and staff
   - Indexed for performance

2. **`low_stock_threshold` column**
   - Added to `products` table
   - Default value: 5
   - Used for low stock alerts

3. **VIP system updates**
   - `source` column in `vip_consumptions`
   - Updated constraint to allow 'pos' source
   - Extended `vip_points_log` source types

---

## Troubleshooting

### Staff Can't Login

**Check:**
1. User exists in database
2. User has `role = 'staff'` or `role = 'admin'`
3. Password is hashed with bcrypt
4. Email is correct (case-insensitive)

**Verify:**
```sql
SELECT id, name, email, role, password_hash IS NOT NULL as has_password
FROM users
WHERE email = 'staff@versatalent.com';
```

### NFC Card Not Linking

**Check:**
1. Card exists in `nfc_cards` table
2. Card has `is_active = true`
3. Card has valid `user_id`
4. User exists
5. Order is in `pending` status

**Verify:**
```sql
SELECT
  nc.*,
  u.name as user_name,
  vm.tier as vip_tier
FROM nfc_cards nc
LEFT JOIN users u ON u.id = nc.user_id
LEFT JOIN vip_memberships vm ON vm.user_id = nc.user_id
WHERE nc.card_uid = '04:6B:3E:A2:4F:5D:80';
```

### Stock Not Deducting

**Check:**
1. Order status is `paid`
2. Order has items with valid `product_id`
3. Products exist in database
4. Migration 011 has been run

**Verify inventory movements:**
```sql
SELECT * FROM inventory_movements
WHERE related_order_id = 'order-uuid'
ORDER BY created_at DESC;
```

### Points Not Awarded

**Check:**
1. Customer is linked to order (`customer_user_id` not null)
2. VIP membership exists and is active
3. VIP points rule exists for consumption
4. Order status is `paid`

**Verify:**
```sql
-- Check VIP membership
SELECT * FROM vip_memberships
WHERE user_id = 'customer-uuid';

-- Check points log
SELECT * FROM vip_points_log
WHERE user_id = 'customer-uuid'
AND source = 'consumption_pos'
ORDER BY created_at DESC
LIMIT 5;

-- Check consumption records
SELECT * FROM vip_consumptions
WHERE user_id = 'customer-uuid'
AND source = 'pos'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Best Practices

### For Staff

1. **Always scan NFC card** before completing payment
2. **Check stock levels** before adding to cart
3. **Verify customer details** after NFC scan
4. **Confirm total** before processing payment

### For Admins

1. **Regular stock audits** - Review inventory movements weekly
2. **Monitor low stock** - Check low stock report daily
3. **Set appropriate thresholds** - Adjust `low_stock_threshold` per product
4. **Backup database** - Regular backups before migrations
5. **Test payments** - Use Stripe test cards in development

---

## Security Notes

- Session cookies are httpOnly (cannot be accessed by JavaScript)
- Cookies are secure in production (HTTPS only)
- Passwords hashed with bcrypt
- Role-based access control on all endpoints
- SQL injection protected (parameterized queries)
- Stock validation prevents overselling

---

## Support

For issues or questions:
- Check this documentation
- Review error messages in browser console
- Check database for data integrity
- Contact system administrator

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Compatible with:** VersaTalent Platform v2.0+
