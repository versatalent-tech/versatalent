# VersaTalent VIP Points & Tier System

## Overview

The VIP Points & Tier System is a comprehensive loyalty program integrated with the existing NFC membership system. VIP members earn points through various activities and automatically progress through tiers (Silver → Gold → Black) based on their accumulated points.

---

## Features

### 1. **Automatic Points Awarding**
- **Event Check-ins**: +10 points per check-in (configurable)
- **Purchases**: +1 point per £3 actually paid, after any member discount (configurable)
- **Tier multipliers**: Gold earns 1.5x and Black 2x on check-ins and purchases (configurable)
- **Manual Adjustments**: Admin can add/deduct points manually (no multiplier)

Only VIP members (and artists) earn points; staff or guest cards linked at the till don't.

### 2. **Tier System (yearly requalification)**
Status is earned within each **membership year**, which runs from the anniversary of the day the member joined.

- **Silver**: starting tier
- **Gold**: 500 points earned in a membership year
- **Black**: 1,750 points earned in a membership year

(Thresholds are configurable in Admin → VIP → Point Rules.)

- Reaching a threshold moves the member up **straight away**; that tier is kept for the rest of the year and all of the next.
- At each anniversary the new tier is what the year's points qualify for, but a member drops **at most one tier** (Black → Gold, never straight to Silver).
- The points balance and lifetime points are separate from status: tiers depend only on points earned in the membership year.

### 3. **Member Discounts at the Till**
- Each tier has a discount on till items (default Silver 0%, Gold 10%, Black 20%), set in Admin → VIP → Point Rules.
- Products can be marked "Excluded from member discounts" in POS admin.
- The discount is applied when the member's card is linked at the till and recorded on the order.

### 4. **Activity Tracking**
- Full points history ledger
- Consumption/spending tracking
- Event attendance history
- Real-time tier progression

---

## Database Schema

### Tables Created

#### `vip_memberships`
Stores VIP member status and points.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| tier | TEXT | Current tier (silver/gold/black) |
| points_balance | INTEGER | Current redeemable points |
| lifetime_points | INTEGER | Total points ever earned |
| status | TEXT | Membership status (active/suspended/cancelled) |
| created_at | TIMESTAMP | When membership was created |
| updated_at | TIMESTAMP | Last update timestamp |

#### `vip_consumptions`
Tracks all spending/purchases.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| event_id | UUID | Optional event reference |
| amount | NUMERIC | Amount spent |
| currency | TEXT | Currency code (default: EUR) |
| description | TEXT | Purchase description |
| created_at | TIMESTAMP | Transaction timestamp |

#### `vip_points_log`
Ledger of all point transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| source | TEXT | Point source (event_checkin/consumption/manual_adjust) |
| ref_id | UUID | Reference to source record |
| delta_points | INTEGER | Points added or deducted |
| balance_after | INTEGER | Points balance after transaction |
| metadata | JSONB | Additional transaction data |
| created_at | TIMESTAMP | Transaction timestamp |

#### `vip_point_rules`
Configurable point award rules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| action_type | TEXT | Type of action (event_checkin/consumption) |
| points_per_unit | NUMERIC | Points awarded per unit |
| unit | TEXT | Unit type (event/euro) |
| is_active | BOOLEAN | Whether rule is active |

---

## How It Works

### Points Calculation

#### 1. Event Check-in
When a VIP member checks in using their NFC card:

1. NFC card is scanned (`/nfc/{card_uid}`)
2. User is identified and check-in is logged
3. System looks up the `event_checkin` point rule (default: 10 points)
4. Points are awarded automatically
5. Membership points are updated
6. Tier is recalculated and auto-upgraded if threshold is met
7. Transaction is logged in `vip_points_log`

**Flow:**
```
NFC Tap → Check-in Created → Award Points → Update Membership → Auto-Upgrade Tier → Log Transaction
```

**API Endpoint:**
```
POST /api/nfc/checkins
{
  "user_id": "uuid",
  "event_id": "uuid", // optional
  "source": "vip_pass"
}

Response:
{
  "checkin": {...},
  "points": {
    "awarded": 10,
    "new_balance": 260,
    "new_tier": "gold"
  }
}
```

#### 2. Consumption Tracking
When a VIP member makes a purchase:

1. Admin/staff records consumption
2. System looks up the `consumption` point rule (default: 1 point per £3)
3. Points = floor(amount × points_per_unit)
4. Points are awarded
5. Membership is updated
6. Tier is recalculated
7. Transaction is logged

**Flow:**
```
Record Purchase → Calculate Points → Award Points → Update Membership → Auto-Upgrade Tier → Log Transaction
```

**API Endpoint:**
```
POST /api/vip/consumption
{
  "user_id": "uuid",
  "amount": 150.00,
  "currency": "EUR",
  "description": "VIP lounge food and drinks"
}

Response:
{
  "consumption": {...},
  "points": {
    "awarded": 50,
    "new_balance": 310,
    "new_tier": "silver"
  }
}
```

#### 3. Manual Point Adjustment
Admins can manually adjust points for special cases:

**API Endpoint:**
```
POST /api/vip/points/adjust
{
  "user_id": "uuid",
  "delta_points": 100, // or -50 for deduction
  "reason": "Compensation for service issue"
}

Response:
{
  "success": true,
  "delta_points": 100,
  "new_balance": 510,
  "new_tier": "gold"
}
```

### Tier Upgrades and Requalification

Each `vip_memberships` row tracks the membership year (migration `023_vip_tiers_and_discounts.sql`):

| Column | Meaning |
|--------|---------|
| `year_start` | Start of the current membership year (anniversary of joining) |
| `status_points` | Points earned in the current membership year |
| `base_tier` | Tier secured for the whole current year |
| `tier` | `base_tier`, or higher once `status_points` reach a higher threshold |

**Logic** (`src/lib/vip-tier-rules.ts`, `src/lib/services/vip-points-service.ts`):
- Every point change also changes `status_points`; the tier becomes the higher of `base_tier` and what `status_points` qualify for. Within a year a member never drops below `base_tier`.
- When a membership is read or changed after its year has ended, it moves into the new year: `base_tier` becomes what the finished year's points qualify for, but no more than one tier below the tier held; `status_points` resets to 0. Each further year with no points drops one more tier.

**Example:**
```
Member joined 15 March. Silver, 480 points this year
→ Earns 30 points → 510 this year → Gold straight away
→ Next 15 March: qualified Gold → Gold for the whole new year
→ Earns only 200 that year → following 15 March: drops to Silver
   (a Black member in the same position would drop to Gold)
```

---

## Frontend Pages

### 1. VIP Profile Page (`/vip/{user_id}`)

**Features:**
- Displays current tier with styling (silver/gold/black)
- Shows current points balance
- Shows lifetime points
- Progress bar to next tier
- "Check-in & Earn Points" button
- **Tabs:**
  - Points History (all transactions)
  - Check-ins (attendance log)

**Access:**
- Direct URL: `/vip/{user_id}`
- Via NFC scan: `/nfc/{card_uid}` → redirects to VIP profile

### 2. Admin VIP Management (`/admin/vip`)

**Features:**
- **VIP Memberships Tab:**
  - View all VIP members
  - See tier distribution stats
  - Adjust points manually for any member

- **Consumption Tab:**
  - View all consumption records
  - Add new consumption (awards points automatically)
  - See spending statistics

**Access:**
- Navigate to `/admin` → Click "VIP Management" tile
- Or directly: `/admin/vip`

### 3. Admin NFC Management (`/admin/nfc`)

Existing NFC system remains intact. Points are awarded automatically during check-ins.

---

## Usage Guide

### For Admins

#### Register a New Consumption
1. Go to `/admin/vip`
2. Click "Consumption" tab
3. Click "Add Consumption"
4. Select VIP member
5. Enter amount (e.g., 150.00)
6. Add description (optional)
7. Click "Record Consumption"
8. Points are automatically awarded (1 point per £3)

#### Manually Adjust Points
1. Go to `/admin/vip`
2. Click "VIP Memberships" tab
3. Find the member
4. Click "Adjust Points"
5. Enter adjustment (positive to add, negative to deduct)
6. Enter reason
7. Click "Confirm Adjustment"

#### View Points History
1. Go to VIP profile page: `/vip/{user_id}`
2. Click "Points History" tab
3. See all point transactions with sources

#### Configure Point Rules
Point rules are stored in `vip_point_rules` table.

**Default Rules:**
- `event_checkin`: 10 points per event
- `consumption`: 1 point per £3

**To modify:**
```sql
UPDATE vip_point_rules
SET points_per_unit = 15
WHERE action_type = 'event_checkin';
```

Or create API endpoint to manage rules via UI.

### For VIP Members

#### Check Your Points
1. Scan your NFC card or visit `/vip/{your_id}`
2. See your current tier, points, and progress
3. View your points history and check-ins

#### Earn Points
- **Check-in at events**: Scan your NFC card (+10 points)
- **Make purchases**: Tap your card at the till (+1 point per £3 paid, multiplied by your tier rate)

#### Tier Benefits
- **Silver**: Standard VIP access
- **Gold**: Enhanced VIP perks
- **Black**: Premium VIP treatment

---

## API Endpoints

### VIP Memberships

```
GET  /api/vip/memberships                    # Get all VIP memberships
POST /api/vip/memberships                    # Create new membership
GET  /api/vip/memberships/{user_id}          # Get specific membership
PUT  /api/vip/memberships/{user_id}          # Update membership
```

### Consumption Tracking

```
GET  /api/vip/consumption                    # Get all consumptions
POST /api/vip/consumption                    # Record new consumption & award points
```

### Points Management

```
GET  /api/vip/points-log                     # Get all points transactions
GET  /api/vip/points-log?user_id={id}        # Get user's points history
POST /api/vip/points/adjust                  # Manual points adjustment
```

### Point Rules

```
GET  /api/vip/point-rules                    # Get all point rules
POST /api/vip/point-rules                    # Create/update point rule
PUT  /api/vip/point-rules                    # Update existing rule
```

---

## Migration & Setup

### 1. Run Database Migration

```bash
# In your Neon database console, run:
versatalent/src/db/migrations/002_vip_points_system.sql
```

This creates all tables, indexes, triggers, and default rules.

### 2. Verify Tables

```sql
SELECT * FROM vip_memberships;
SELECT * FROM vip_consumptions;
SELECT * FROM vip_points_log;
SELECT * FROM vip_point_rules;
```

### 3. Create VIP Memberships for Existing Users

VIP memberships are created automatically when:
- A VIP user checks in for the first time
- Points are awarded to a user without a membership
- Admin manually creates consumption for a user

Or run manually:

```sql
INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
SELECT id, 'silver', 0, 0, 'active'
FROM users
WHERE role = 'vip'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Deployment

### Environment Variables

No new environment variables required. Uses existing:
```
DATABASE_URL=postgresql://...
```

### Build & Deploy

```bash
# Build the project
cd versatalent
bun run build

# Deploy to Netlify (dynamic site)
# Or commit and push to GitHub for automatic deployment
git add .
git commit -m "Add VIP points and tier system"
git push origin main
```

---

## Troubleshooting

### Points Not Awarded After Check-in

**Check:**
1. Is the user a VIP or Artist role?
2. Is the `event_checkin` rule active in `vip_point_rules`?
3. Check server logs for errors
4. Verify VIP membership exists for the user

**Solution:**
```sql
-- Check if membership exists
SELECT * FROM vip_memberships WHERE user_id = '{user_id}';

-- Create if missing
INSERT INTO vip_memberships (user_id, tier, points_balance, lifetime_points, status)
VALUES ('{user_id}', 'silver', 0, 0, 'active');
```

### Tier Not Upgrading

**Check:**
1. Verify points balance is above tier threshold
2. Check if auto-upgrade trigger is active

**Solution:**
```sql
-- Manually recalculate tier
UPDATE vip_memberships
SET tier = calculate_vip_tier(points_balance)
WHERE user_id = '{user_id}';
```

### Consumption Not Recording Points

**Check:**
1. Amount must be > 0
2. User must exist
3. `consumption` rule must be active

**Solution:**
Check `vip_point_rules`:
```sql
SELECT * FROM vip_point_rules WHERE action_type = 'consumption';
```

If missing, insert:
```sql
INSERT INTO vip_point_rules (action_type, points_per_unit, unit, is_active)
VALUES ('consumption', 1, 'euro', TRUE);
```

---

## Future Enhancements

### Potential Features

1. **Points Redemption**
   - Allow VIPs to redeem points for rewards
   - Create rewards catalog
   - Track redemptions

2. **Points Expiry**
   - Add expiration date to points
   - Automated expiry job

3. **Tier Benefits Management**
   - Configure benefits per tier
   - Display benefits on VIP page

4. **Leaderboards**
   - Show top VIPs by lifetime points
   - Monthly/yearly rankings

5. **Email Notifications**
   - Notify on tier upgrade
   - Monthly points summary
   - Special offers for high-tier members

6. **Mobile App Integration**
   - QR code scanning
   - Push notifications for points
   - Digital VIP card

---

## Support

For questions or issues:
- Check this documentation first
- Review the code comments in repository files
- Test in staging environment before production
- Contact VersaTalent technical support

---

**Created:** November 2025
**Version:** 1.0
**System:** VersaTalent NFC & VIP Management
