# NFC Card Metadata Auto-Population Feature

## Overview

NFC cards now automatically populate their `metadata` field with the user's VIP tier and associated benefits. This metadata is dynamically updated whenever a user's VIP tier changes.

## Metadata Structure

```json
{
  "membership_tier": "gold",
  "benefits": [
    "Priority seating",
    "VIP lounge access",
    "10% discount on merchandise"
  ]
}
```

- **membership_tier**: The user's current VIP tier (`silver`, `gold`, `black`, or `none`)
- **benefits**: Array of benefit titles associated with that tier (pulled from the `vip_tier_benefits` table)

## When Metadata is Populated/Updated

### 1. NFC Card Creation
When a new NFC card is created via `/api/nfc/cards` (POST):
- The system checks if the user has a VIP membership
- If yes, fetches active benefits for their current tier
- Automatically populates the metadata field
- If no VIP membership exists, sets tier to `"none"` with empty benefits array

**Implementation**: `src/lib/db/repositories/nfc-cards.ts` - `createNFCCard()` function

### 2. VIP Tier Upgrades via Points
When points are awarded (check-ins, consumption, manual adjustments):
- Points are added to the user's membership
- System checks if the tier changed (based on point thresholds)
- If tier changed, all NFC cards for that user are updated with new metadata

**Point Thresholds**:
- Silver: 0+ points
- Gold: 500+ points
- Black: 1750+ points

**Implementation**: `src/lib/services/vip-points-service.ts` - `awardPoints()` function

### 3. Manual Tier Changes
When an admin manually updates a user's VIP tier via `/api/vip/memberships/[user_id]` (PUT):
- If the `tier` field is updated, all NFC cards for that user are updated
- New metadata is generated based on the updated tier

**Implementation**: `src/app/api/vip/memberships/[user_id]/route.ts`

## Key Functions

### `generateNFCCardMetadata(userId: string)`
**Location**: `src/lib/db/repositories/nfc-cards.ts`

Generates metadata object for a user based on their current VIP tier:
1. Fetches user's VIP membership
2. Queries active benefits for their tier from `vip_tier_benefits` table
3. Returns formatted metadata object

### `updateUserNFCCardsMetadata(userId: string)`
**Location**: `src/lib/db/repositories/nfc-cards.ts`

Updates metadata for all NFC cards belonging to a user:
1. Calls `generateNFCCardMetadata()` to get current tier/benefits
2. Updates all NFC cards with `user_id` matching the provided ID

## Database Tables Involved

1. **nfc_cards**: Stores the NFC card with metadata JSON field
2. **vip_memberships**: Stores user's VIP tier and points
3. **vip_tier_benefits**: Stores benefits for each tier (title, description)
4. **users**: Links cards to users

## Example Flow

### Scenario: User checks in to an event and gets upgraded

1. User taps NFC card at event
2. Check-in is recorded
3. Points service awards 10 points
4. User goes from 495 → 505 points
5. Tier automatically changes from `silver` to `gold`
6. System detects tier change
7. All user's NFC cards metadata updated:
   ```json
   {
     "membership_tier": "gold",
     "benefits": [
       "Gold benefit 1",
       "Gold benefit 2",
       "Gold benefit 3"
     ]
   }
   ```

## Admin Configuration

Admins can manage tier benefits via:
- Admin panel: `/admin/vip`
- API endpoints: `/api/admin/tier-benefits`

Adding/removing/updating benefits will automatically reflect in newly created NFC cards and when tiers are updated.

## Error Handling

- If metadata generation fails, the system logs an error but doesn't fail the main operation
- Default fallback metadata: `{ membership_tier: "none", benefits: [] }`
- Metadata update failures during tier upgrades don't prevent the tier upgrade itself

## Testing the Feature

1. **Create a new NFC card**: Check that metadata is populated with current tier
2. **Award points to trigger tier upgrade**: Verify metadata updates across all user's cards
3. **Manually change tier**: Confirm metadata reflects the change
4. **Add new tier benefits**: Create a card and verify benefits appear in metadata
