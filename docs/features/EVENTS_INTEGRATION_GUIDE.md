# Events Systems Integration Guide

## Current State

VersaTalent has **two separate event systems** that serve different purposes:

### 1. **NFC Events** (`nfc_events` table)
**Purpose:** Track NFC check-ins at physical events  
**Created:** Migration 001  
**Used by:** NFC check-in system, VIP points system  
**Fields:** Simple (id, name, date, location, description, is_active)

### 2. **Public Events** (`events` table)
**Purpose:** Display events on website (homepage, events page)  
**Created:** Migration 004  
**Used by:** Public website, marketing, event listings  
**Fields:** Rich (title, type, venue, pricing, ticketing, talent, etc.)

---

## Why Two Tables?

These tables serve **different purposes**:

- **`nfc_events`**: Operational - for tracking who attended what event via NFC
- **`events`**: Marketing - for displaying event information to website visitors

**Example:**
- A VIP member taps their NFC card at an event → logged in `nfc_events` → earns points
- Same event displayed on website homepage → read from `events` table → shows details

---

## Integration (Migration 005)

### What Changed

**Added to `nfc_events` table:**
```sql
-- Optional link to public events
event_id UUID REFERENCES events(id)
```

This creates a **one-to-many** relationship:
- One public `event` can have one `nfc_event` for check-ins
- `nfc_events` can exist independently (for private/internal events)
- `events` can exist without NFC check-ins (for past events, external events)

### New Capabilities

**1. Helper Function: Create NFC Event from Public Event**
```sql
SELECT create_nfc_event_from_event(
  'event-uuid-here',
  TRUE -- enable check-ins
);
```

**2. Helper Function: Find NFC Event for Public Event**
```sql
SELECT get_nfc_event_for_event('event-uuid-here');
```

**3. View: Events with Check-in Stats**
```sql
SELECT * FROM events_with_checkins;
-- Returns: title, start_time, nfc_event_id, checkins_enabled, total_checkins, unique_attendees
```

---

## Admin Workflow

### Creating an Event (With NFC Check-ins)

**Step 1:** Create the public event via admin UI
```javascript
POST /api/events
{
  "title": "VersaTalent Showcase",
  "description": "...",
  "type": "performance",
  "start_time": "2025-06-15T19:00:00Z",
  "end_time": "2025-06-15T23:00:00Z",
  "venue": {...},
  "featured": true,
  "is_published": true
}
```

**Step 2:** If NFC check-ins needed, enable them:
```javascript
POST /api/events/{eventId}/enable-checkins
// This calls: create_nfc_event_from_event(eventId, TRUE)
```

**Step 3:** VIP members can now check in at the event
- Tap NFC card → logged in `nfc_events` → earns points
- Event displayed on website from `events` table

### Creating an Event (Without NFC Check-ins)

**Just Step 1 above** - Event shows on website, no check-in tracking

---

## Frontend Integration Status

### ✅ Already Integrated (Migration 004)

**Homepage:**
- Fetches from `/api/events?status=upcoming`
- Shows 3 featured upcoming events
- Uses `events` table

**Events Page:**
- Fetches upcoming and past events from database
- Separates into two sections
- Uses `events` table

**Admin Events Page:**
- Full CRUD operations
- Uses `/api/events` endpoints
- **NEEDS UPDATE:** Still uses old EventItem type (see below)

### ⏳ Needs Integration

**Admin Events Page Updates:**
1. Replace `EventItem` type with `Event` from database
2. Add "Enable NFC Check-ins" checkbox to event form
3. Call integration API when check-ins enabled
4. Show check-in stats for events with NFC enabled

---

## API Endpoints

### Public Events Endpoints (Already Exist)

```bash
GET  /api/events                 # All events
GET  /api/events?status=upcoming # Upcoming only
GET  /api/events?status=past     # Past only
GET  /api/events/{id}            # Single event
POST /api/events                 # Create (admin)
PUT  /api/events/{id}            # Update (admin)
DELETE /api/events/{id}          # Delete (admin)
```

### Integration Endpoints (Need to Create)

```bash
POST /api/events/{id}/enable-checkins  # Enable NFC check-ins for event
GET  /api/events/{id}/checkins         # Get check-in stats
POST /api/events/{id}/disable-checkins # Disable NFC check-ins
```

---

## Database Queries

### Get All Events with Check-in Status

```sql
SELECT 
  e.id,
  e.title,
  e.start_time,
  ne.id as nfc_event_id,
  ne.is_active as checkins_enabled,
  COUNT(c.id) as total_checkins
FROM events e
LEFT JOIN nfc_events ne ON ne.event_id = e.id
LEFT JOIN checkins c ON c.event_id = ne.id
GROUP BY e.id, ne.id;
```

### Create Event with Check-ins

```sql
-- 1. Create public event
INSERT INTO events (...) VALUES (...) RETURNING id;

-- 2. Enable check-ins (if needed)
SELECT create_nfc_event_from_event(event_id, TRUE);
```

### Disable Check-ins for Event

```sql
UPDATE nfc_events 
SET is_active = FALSE 
WHERE event_id = 'event-uuid';
```

---

## Migration Sequence

**Order of execution:**

1. ✅ `001_initial_schema.sql` - Creates `nfc_events`, `checkins`
2. ✅ `002_vip_points_system.sql` - VIP memberships, points
3. ✅ `003_vip_tier_benefits.sql` - VIP tier benefits
4. ✅ `004_events_system.sql` - Creates `events` table
5. **⏳ `005_integrate_events_systems.sql` - Links them together**

---

## Next Steps

### 1. Run Migration 005
```bash
# In Neon Console, execute:
# versatalent/src/db/migrations/005_integrate_events_systems.sql
```

### 2. Test Integration
```sql
-- Verify nfc_events has event_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nfc_events';

-- Test the integration view
SELECT * FROM events_with_checkins;
```

### 3. Update Admin UI (Small Changes)
- Add "Enable NFC Check-ins" checkbox to event form
- Show check-in stats for events with NFC enabled
- Add enable/disable check-ins buttons

### 4. Create Integration API Routes
- `/api/events/[id]/enable-checkins`
- `/api/events/[id]/checkins` (stats)
- `/api/events/[id]/disable-checkins`

---

## Best Practices

### When to Use Each System

**Use `events` table for:**
- Public event listings
- Homepage featured events
- Event marketing pages
- Past event archives

**Use `nfc_events` table for:**
- Physical event check-ins
- VIP point tracking
- Attendance analytics
- Internal-only events

**Link them when:**
- Public event needs check-in tracking
- Want to show check-in stats on event page
- VIP members attend public events

**Keep separate when:**
- Private/internal events (NFC only)
- External events you don't host (events only)
- Past events no longer need check-ins

---

## Troubleshooting

### Event doesn't show on homepage
**Check:**
- Is `featured = TRUE` in `events` table?
- Is `is_published = TRUE`?
- Is event upcoming (`end_time >= NOW()`)?

### Check-ins not working
**Check:**
- Does `nfc_events` have `event_id` linked to `events.id`?
- Is `nfc_events.is_active = TRUE`?
- Does user have valid NFC card?

### Duplicate events
**Don't panic!**
- `events` and `nfc_events` are separate tables (by design)
- Check which table the duplicate is in
- If in `nfc_events`, check if `event_id` links to public event

---

## Summary

**Before Integration:**
- Two separate event systems
- No connection between them
- Duplicate event data

**After Integration (Migration 005):**
- Systems linked via `nfc_events.event_id`
- Helper functions for easy sync
- Unified view of events with check-in stats
- No duplicate data (events reference each other)

**Result:**
- Clean separation of concerns
- Flexible (can use independently or together)
- No breaking changes to existing data
- Easy to enable/disable check-ins per event

---

**Version:** 005  
**Status:** Integration Migration Created  
**Next:** Run migration 005 in Neon Console
