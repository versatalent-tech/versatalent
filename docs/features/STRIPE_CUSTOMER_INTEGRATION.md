# 💳 Stripe Customer Integration

## Overview

The VersaTalent platform now integrates Stripe Customer management with user registration and POS payments. Every user created in the system is automatically linked to a Stripe Customer, enabling:

- **Unified Payment Tracking**: All payments are associated with the correct customer in Stripe
- **Purchase History**: Complete order history viewable in the admin panel
- **Customer Insights**: Direct links to Stripe dashboard for detailed payment analytics
- **Loyalty Integration**: Seamless connection between VIP points and payment data

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────┐
│  User Created   │
│  (Signup Form)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. Create User in Database  │
│    - Name, Email, Role      │
│    - Generate Password      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. Create Stripe Customer   │
│    - Call Stripe API        │
│    - Store customer ID      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. Update User Record       │
│    - Set stripe_customer_id │
└─────────────────────────────┘


┌─────────────────┐
│  POS Checkout   │
│  (Staff)        │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ 1. Get User's Stripe ID      │
│    - Query users table       │
│    - Create if missing       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 2. Create Payment Intent     │
│    - Attach customer         │
│    - Process payment         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 3. Record Order in Database  │
│    - Link to customer        │
│    - Award VIP points        │
└──────────────────────────────┘
```

---

## 📁 File Structure

### Database

- **Migration**: `src/db/migrations/012_stripe_customer_integration.sql`
  - Adds `stripe_customer_id` column to `users` table
  - Creates index for fast lookups
  - Adds unique constraint

### Backend Services

- **Stripe Service**: `src/lib/services/stripe.ts`
  - `getStripeClient()` - Initialize Stripe
  - `createStripeCustomer(user)` - Create customer
  - `ensureStripeCustomer(user, existingId)` - Get or create
  - `getStripeCustomer(customerId)` - Retrieve customer
  - `updateStripeCustomer(customerId, updates)` - Update customer
  - `getCustomerPaymentMethods(customerId)` - List payment methods
  - `getCustomerTotalSpent(customerId)` - Calculate total spent

### Repositories

- **Users Repository**: `src/lib/db/repositories/users.ts`
  - Updated `createUser()` to create Stripe customer
  - Updated `updateUser()` to support `stripe_customer_id`

- **Purchase History Repository**: `src/lib/db/repositories/purchase-history.ts`
  - `getUserPurchaseHistory(userId)` - Get all orders and items
  - `getUserPurchaseStats(userId)` - Get purchase statistics
  - `getUserPurchaseHistoryByDateRange(userId, start, end)` - Filter by date

### API Routes

- **Payment Intent**: `src/app/api/pos/create-payment-intent/route.ts`
  - Updated to attach Stripe customer to payments
  - Creates customer if missing

- **Purchase History**: `src/app/api/admin/users/[id]/purchases/route.ts`
  - GET endpoint for user purchase history
  - Returns orders, items, and statistics
  - Admin authentication required

### Frontend Components

- **Purchase History**: `src/components/admin/PurchaseHistory.tsx`
  - Displays user purchase history
  - Shows order details, items, statistics
  - Links to Stripe dashboard
  - Expandable order items

- **Users Manager**: `src/components/admin/nfc/UsersManager.tsx`
  - Added "View Purchases" button
  - Opens purchase history dialog

### Type Definitions

- **Types**: `src/lib/db/types.ts`
  - `User.stripe_customer_id?: string`
  - `UpdateUserRequest.stripe_customer_id?: string`
  - `PurchaseHistoryItem`
  - `PurchaseHistoryOrder`
  - `UserPurchaseHistory`
  - `PurchaseHistoryStats`

---

## 🚀 Setup Instructions

### 1. Run Database Migration

Connect to your Neon database and run:

```bash
psql $DATABASE_URL -f src/db/migrations/012_stripe_customer_integration.sql
```

Or in the Neon console, copy and paste the contents of the migration file.

### 2. Verify Stripe Configuration

Ensure your `.env` file has:

```env
STRIPE_SECRET_KEY=sk_test_xxxxx...  # Test key
# STRIPE_SECRET_KEY=sk_live_xxxxx...  # Production key (when ready)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx...
```

### 3. Test the Integration

1. **Create a new user** via the admin NFC management page
2. **Check the database** - user should have a `stripe_customer_id`
3. **View in Stripe** - customer should appear in Stripe dashboard
4. **Make a POS purchase** - payment should be linked to customer
5. **View purchase history** - orders should appear in admin panel

---

## 🔄 User Creation Flow

### What Happens When a User is Created

1. **Database Record Created**
   - User inserted into `users` table
   - All required fields validated

2. **Stripe Customer Created** (Asynchronous)
   - Call to Stripe API: `stripe.customers.create()`
   - Customer metadata includes:
     - `versatalent_user_id`: Internal user ID
     - `versatalent_role`: User role (vip, artist, staff, admin)
     - `created_via`: "versatalent_registration"

3. **User Updated with Stripe ID**
   - `stripe_customer_id` saved to database
   - Future payments will use this ID

### Error Handling

- **User creation ALWAYS succeeds** even if Stripe fails
- If Stripe fails:
  - Error logged to console
  - User created without `stripe_customer_id`
  - ID can be populated later during first payment

---

## 💳 POS Payment Flow

### What Happens During Checkout

1. **Customer Linked** (if available)
   - Staff attaches customer via NFC or manual selection
   - Order created with `customer_user_id`

2. **Payment Intent Creation**
   - System retrieves user's `stripe_customer_id`
   - If missing, creates Stripe customer on-the-fly
   - Updates user record with new ID

3. **Payment Processing**
   - Payment Intent created with:
     - `customer`: Stripe customer ID
     - `amount`: Order total
     - `metadata`: Order ID, customer ID, staff ID

4. **Order Completion**
   - Payment succeeded
   - Order marked as "paid"
   - VIP points awarded (if applicable)

---

## 📊 Purchase History

### Viewing Purchase History

1. **Navigate to Admin NFC Management**
   - Go to `/admin/nfc`
   - Click "Users" tab

2. **Select a User**
   - Click the receipt icon (📄) next to any user
   - Purchase history dialog opens

3. **View Details**
   - **Statistics**: Total orders, total spent, items purchased
   - **Stripe Link**: Direct link to customer in Stripe dashboard
   - **Top Items**: Most frequently purchased products
   - **Order List**: Expandable list of all orders

### What Data is Shown

- **Per Order**:
  - Order date and time
  - Total amount
  - Payment status
  - Stripe payment intent ID
  - Staff member who processed it
  - List of items with quantities and prices
  - Order notes (if any)

- **Statistics**:
  - Total number of orders
  - Total amount spent
  - Average order value
  - Number of items purchased
  - First purchase date
  - Last purchase date
  - Top 5 most purchased items

---

## 🔗 Stripe Dashboard Integration

### View Customer in Stripe

From the purchase history, click **"View in Stripe"** to:
- See complete payment history
- View payment methods on file
- Check refunds and disputes
- Manage subscriptions (if added later)
- View customer timeline

Direct link format:
```
https://dashboard.stripe.com/customers/{stripe_customer_id}
```

### View Payment in Stripe

Click on any payment intent link to:
- See payment details
- Check payment status
- Process refunds
- View receipt
- Download invoice

Direct link format:
```
https://dashboard.stripe.com/payments/{stripe_payment_intent_id}
```

---

## 🔐 Security Considerations

### Data Protection

1. **Stripe Customer IDs are stored** in the database
   - Safe to store (not sensitive like API keys)
   - Used for linking payments to customers
   - No payment method details stored locally

2. **Payment Methods**
   - Never stored in VersaTalent database
   - Always handled by Stripe
   - Retrieved via Stripe API when needed

3. **Admin Access Only**
   - Purchase history requires admin authentication
   - Uses `withAdminAuth` middleware
   - Customer data not exposed to public

### Best Practices

- ✅ Stripe keys stored in environment variables
- ✅ No hardcoded credentials
- ✅ Stripe customer IDs are public identifiers (safe)
- ✅ API calls made server-side only
- ✅ User data sanitized before sending to Stripe

---

## 🧪 Testing

### Test User Creation with Stripe

```bash
# Create a test user via the admin panel or API
curl -X POST http://localhost:3000/api/nfc/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test VIP",
    "email": "testvip@example.com",
    "role": "vip",
    "password": "test123"
  }'

# Check database
psql $DATABASE_URL -c "
  SELECT id, name, email, stripe_customer_id
  FROM users
  WHERE email = 'testvip@example.com'
"

# Verify in Stripe
# Go to https://dashboard.stripe.com/test/customers
# Search for testvip@example.com
```

### Test POS Payment with Customer

```bash
# 1. Create an order via POS
# 2. Attach customer via NFC or selection
# 3. Process payment with test card: 4242 4242 4242 4242
# 4. Check that payment has customer attached:

# In Stripe Dashboard:
# - Go to Payments
# - Click on the payment
# - Check "Customer" field is populated
```

### Test Purchase History

```bash
# 1. Create several test orders for a user
# 2. Navigate to /admin/nfc
# 3. Click the receipt icon next to the user
# 4. Verify:
#    - All orders appear
#    - Statistics are accurate
#    - Items are listed correctly
#    - Stripe links work
```

---

## 🐛 Troubleshooting

### User Created but No Stripe Customer

**Symptoms**: User exists but `stripe_customer_id` is null

**Causes**:
- Stripe API error during creation
- Network timeout
- Invalid Stripe key

**Solution**:
1. Check server logs for Stripe errors
2. Verify `STRIPE_SECRET_KEY` is set correctly
3. Customer will be created on first payment

### Payment Not Linked to Customer

**Symptoms**: Payment succeeds but not attached to Stripe customer

**Causes**:
- No customer selected in POS
- Order created without `customer_user_id`

**Solution**:
1. Ensure NFC card is scanned or customer is manually selected
2. Check `pos_orders.customer_user_id` is set
3. Retry payment with customer attached

### Purchase History Not Loading

**Symptoms**: Dialog opens but shows loading spinner forever

**Causes**:
- API endpoint returning error
- Invalid user ID
- Database query failure

**Solution**:
1. Check browser console for errors
2. Verify `/api/admin/users/[id]/purchases` endpoint works
3. Check server logs for database errors
4. Ensure migration 012 was run

### Stripe Customer ID Mismatch

**Symptoms**: User has Stripe ID but customer not found in Stripe

**Causes**:
- Using test/live key mismatch
- Customer deleted in Stripe
- Stripe ID copied from different environment

**Solution**:
1. Verify environment (test vs production)
2. Check Stripe dashboard for customer
3. If not found, set `stripe_customer_id` to null and retry payment

---

## 📈 Future Enhancements

### Planned Features

1. **Subscription Management**
   - VIP memberships as Stripe subscriptions
   - Automatic tier upgrades
   - Recurring payments

2. **Payment Method Management**
   - Save cards for repeat customers
   - Default payment method selection
   - Payment method deletion

3. **Advanced Analytics**
   - Revenue by customer segment
   - Lifetime value calculations
   - Churn prediction
   - Purchase trends

4. **Automated Email Receipts**
   - Stripe receipt emails
   - Custom VersaTalent receipts
   - Purchase summaries

5. **Refund Management**
   - Process refunds from admin panel
   - Adjust VIP points on refund
   - Track refund reasons

---

## 🔍 API Reference

### GET /api/admin/users/:id/purchases

Get complete purchase history for a user.

**Authentication**: Admin only

**Response**:
```json
{
  "user_id": "uuid",
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "stripe_customer_id": "cus_xxxxx",
  "total_orders": 15,
  "total_spent_cents": 45000,
  "currency": "EUR",
  "orders": [
    {
      "id": "uuid",
      "order_date": "2024-01-15T10:30:00Z",
      "total_cents": 3500,
      "currency": "EUR",
      "status": "paid",
      "stripe_payment_intent_id": "pi_xxxxx",
      "items": [
        {
          "id": "uuid",
          "product_name": "Espresso",
          "quantity": 2,
          "unit_price_cents": 250,
          "line_total_cents": 500
        }
      ],
      "staff_user": {
        "id": "uuid",
        "name": "Staff Member"
      }
    }
  ],
  "stats": {
    "total_orders": 15,
    "total_items_purchased": 42,
    "total_spent_cents": 45000,
    "average_order_value_cents": 3000,
    "most_purchased_items": [
      {
        "product_name": "Espresso",
        "total_quantity": 20,
        "total_spent_cents": 5000
      }
    ],
    "first_purchase_date": "2024-01-01T00:00:00Z",
    "last_purchase_date": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📞 Support

### Common Questions

**Q: What happens if Stripe is down when creating a user?**
A: User creation will still succeed. The `stripe_customer_id` will be null and can be created later during the first payment.

**Q: Can I manually link a user to an existing Stripe customer?**
A: Yes, update the `stripe_customer_id` field directly in the database or via the API.

**Q: How do I migrate existing users to have Stripe customers?**
A: Run a migration script that calls `createStripeCustomer()` for each user and updates their record.

**Q: Are test and production Stripe customers separate?**
A: Yes, test mode customers only exist in test mode and vice versa. Make sure to use the correct keys for each environment.

---

## 📝 Related Documentation

- [POS System README](./POS_SYSTEM_README.md) - POS functionality
- [Stripe Setup Guide](./STRIPE_ENV_SETUP.md) - Environment configuration
- [VIP Points System](./VIP_POINTS_SYSTEM_README.md) - Loyalty program
- [NFC System](./NFC_SYSTEM_README.md) - NFC card integration

---

**Last Updated**: December 2024
**Version**: 1.0
**Migration**: 012_stripe_customer_integration.sql
