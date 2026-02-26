# Testing Events Integration

## Get an Event ID

First, get an event ID from your database. Run in Neon Console:

```sql
SELECT id, title FROM events WHERE is_published = TRUE LIMIT 1;
```

Copy the `id` value.

## Test API Endpoints

Replace `{EVENT_ID}` with the actual ID you copied above.

### 1. Check Current Status (Before Enabling)

```bash
curl http://localhost:3000/api/events/{EVENT_ID}/checkins
```

**Expected Response:**
```json
{
  "event_id": "your-event-id",
  "nfc_event_id": null,
  "checkins_enabled": false,
  "total_checkins": 0,
  "unique_attendees": 0
}
```

### 2. Enable NFC Check-ins

```bash
curl -X POST http://localhost:3000/api/events/{EVENT_ID}/checkins
```

**Expected Response:**
```json
{
  "message": "Check-ins enabled",
  "nfc_event_id": "some-uuid",
  "already_existed": false
}
```

### 3. Check Status Again (After Enabling)

```bash
curl http://localhost:3000/api/events/{EVENT_ID}/checkins
```

**Expected Response:**
```json
{
  "event_id": "your-event-id",
  "nfc_event_id": "some-uuid",
  "checkins_enabled": true,
  "total_checkins": 0,
  "unique_attendees": 0
}
```

### 4. Verify in Database

Run in Neon Console:

```sql
-- Should now show the linked nfc_event
SELECT 
  e.title,
  e.start_time,
  ne.id as nfc_event_id,
  ne.name as nfc_event_name,
  ne.is_active as checkins_enabled
FROM events e
LEFT JOIN nfc_events ne ON ne.event_id = e.id
WHERE e.id = '{EVENT_ID}';
```

**Expected:** Shows the event with linked nfc_event

### 5. Disable Check-ins

```bash
curl -X DELETE http://localhost:3000/api/events/{EVENT_ID}/checkins
```

**Expected Response:**
```json
{
  "message": "Check-ins disabled",
  "nfc_event_id": "some-uuid"
}
```

### 6. Final Verification

```bash
curl http://localhost:3000/api/events/{EVENT_ID}/checkins
```

**Expected Response:**
```json
{
  "event_id": "your-event-id",
  "nfc_event_id": "some-uuid",
  "checkins_enabled": false,  // Now disabled
  "total_checkins": 0,
  "unique_attendees": 0
}
```

---

## Success Criteria

 All API endpoints respond without errors
 Can enable check-ins (creates nfc_event)
 Can get check-in stats
 Can disable check-ins (preserves history)
 Database shows linked nfc_event
 events_with_checkins view works

---

## Next: Test on Website

1. Visit http://localhost:3000
2. Scroll to "Featured Events" section
3. Should see "VersaTalent Summer Showcase 2025"
4. Click on it or visit http://localhost:3000/events
5. Events page should show upcoming and past events

