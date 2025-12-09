# POS System Quick Start Guide

## 5-Minute Setup

Follow these steps to get the POS system running:

### Step 1: Run Database Migration ⏱️ 1 min

1. Open Neon Console: https://console.neon.tech
2. Select your VersaTalent database
3. Open SQL Editor
4. Copy and paste the contents of `src/db/migrations/008_pos_system.sql`
5. Click "Run" to execute

✅ This creates the products, pos_orders, and pos_order_items tables with sample data.

### Step 2: Access the POS ⏱️ 1 min

1. Start your development server:
   ```bash
   cd versatalent
   bun run dev
   ```

2. Login as admin:
   - URL: http://localhost:3000/admin/login
   - Username: admin
   - Password: (your admin password)

3. Navigate to POS:
   - URL: http://localhost:3000/pos

✅ You should see the POS interface with sample products!

### Step 3: Test a Sale ⏱️ 2 min

1. **Add products to cart:**
   - Click on "Espresso" (€2.50)
   - Click on "Cappuccino" (€3.50)
   - Cart shows 2 items, total €6.00

2. **Process checkout:**
   - Click "Checkout" button
   - Order is created and marked as paid
   - Success message appears
   - Cart clears automatically

3. **View order in admin:**
   - Go to http://localhost:3000/admin/pos/orders
   - See your order in the list
   - Status shows "Paid"

✅ POS is working! You just processed your first sale.

### Step 4: Manage Products ⏱️ 1 min

1. Navigate to product management:
   - URL: http://localhost:3000/admin/pos/products

2. **Add a new product:**
   - Click "Add Product"
   - Name: "Cold Brew Coffee"
   - Price: €4.00
   - Category: "Drinks"
   - Stock: 50
   - Click "Save"

3. **Edit existing product:**
   - Find "Espresso" in list
   - Click "Edit"
   - Change price to €2.75
   - Click "Save"

✅ You can now manage your product catalog!

## Testing VIP Points Integration

### Prerequisites

You need a VIP member with an NFC card. If you don't have one:

1. Run migrations 001 and 002 (VIP system)
2. Sample VIP user created: vip@example.com
3. Sample NFC card: SAMPLE-VIP-001

### Test Points Awarding

1. **Create order with customer:**
   ```javascript
   // Using the API directly for testing
   fetch('/api/pos/orders', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       customer_user_id: 'YOUR-VIP-USER-ID',
       items: [
         { product_id: 'PRODUCT-ID', quantity: 1 }
       ]
     })
   })
   ```

2. **Mark as paid:**
   ```javascript
   fetch('/api/pos/orders/ORDER-ID', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ status: 'paid' })
   })
   ```

3. **Check VIP points:**
   - Points awarded based on amount spent
   - Default: 1 point per €3 spent
   - Check `vip_points_log` table for entry
   - Check `vip_memberships` for updated balance

## Stripe Integration (Optional)

For production use, integrate Stripe for real payments:

### 1. Get Stripe Keys

1. Sign up at https://stripe.com
2. Get test API keys from dashboard
3. Add to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   ```

### 2. Install Stripe

```bash
bun add stripe @stripe/stripe-js @stripe/react-stripe-js
```

### 3. Update Payment API

Edit `src/app/api/pos/create-payment-intent/route.ts`:
- Uncomment Stripe integration code
- Remove placeholder response

### 4. Add Payment UI

Update POS page to use Stripe Elements for card input.

See: https://stripe.com/docs/payments/quickstart

## Common Tasks

### Add Products in Bulk

Use the API to add multiple products:

```javascript
const products = [
  { name: 'Latte', price_cents: 400, category: 'Drinks' },
  { name: 'Americano', price_cents: 300, category: 'Drinks' },
  { name: 'Croissant', price_cents: 350, category: 'Food' }
];

for (const product of products) {
  await fetch('/api/pos/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
}
```

### View All Orders

Query the database directly:

```sql
SELECT
  o.id,
  o.total_cents / 100.0 AS total_euros,
  o.status,
  o.created_at,
  u.name AS customer_name
FROM pos_orders o
LEFT JOIN users u ON o.customer_user_id = u.id
ORDER BY o.created_at DESC
LIMIT 20;
```

### Check VIP Points Awarded

```sql
SELECT
  u.name,
  pl.delta_points,
  pl.balance_after,
  pl.created_at,
  pl.metadata->>'amount' AS purchase_amount
FROM vip_points_log pl
JOIN users u ON pl.user_id = u.id
WHERE pl.source = 'consumption'
ORDER BY pl.created_at DESC;
```

## Next Steps

1. ✅ **Test the POS** - Process a few test orders
2. ✅ **Add Real Products** - Replace sample data with your products
3. ✅ **Test VIP Integration** - Link customer and verify points
4. 🔲 **Configure Stripe** - For production payments
5. 🔲 **Add Staff Users** - Create accounts for your staff
6. 🔲 **Train Staff** - Show them how to use the POS
7. 🔲 **Go Live** - Start processing real sales!

## Support

Need help?

- 📖 **Full Documentation**: See `POS_SYSTEM_README.md`
- 🐛 **Issues**: Check browser console and server logs
- 💡 **Questions**: Review the API examples in documentation

---

**Ready to sell? Start at http://localhost:3000/pos** 🚀
