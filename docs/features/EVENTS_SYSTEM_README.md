# VersaTalent Events System

## Overview

The Events System allows administrators to create, manage, and display events through a database-backed system. Events are stored in Neon PostgreSQL and automatically classified as "upcoming" or "past" based on the current date/time.

## Features

- Database-backed event management with Neon PostgreSQL
- Real-time upcoming/past classification based on current time
- Full CRUD operations via REST API
- Public events page with search and filter
- Featured events on homepage
- Admin dashboard for managing events
- Automatic slug generation from titles
- Support for multiple event types (performance, photoshoot, match, collaboration, workshop, appearance)

## How Upcoming vs Past is Determined

Events are classified in **real-time** based on the current database time:

### Upcoming Events
An event is "upcoming" if:
- `end_time >= NOW()` (event hasn't ended yet)
- OR `end_time IS NULL AND start_time >= NOW()` (no end time set, but start is in future)

### Past Events
An event is "past" if:
- `end_time < NOW()` (event has already ended)

### Sorting
- **Upcoming**: Sorted by `start_time` ASC (soonest first)
- **Past**: Sorted by `start_time` DESC (most recent first)

## Database Schema

See `/src/db/migrations/004_events_system.sql` for the complete schema.

Key fields:
- `id` - UUID primary key
- `title` - Event name (required)
- `slug` - URL-friendly identifier (auto-generated)
- `description` - Event details (required)
- `type` - Event category (performance, photoshoot, etc.)
- `start_time` - When event starts (required)
- `end_time` - When event ends (optional, used for past/upcoming classification)
- `venue` - Location details as JSONB
- `is_published` - Whether event is visible to public
- `featured` - Show on homepage

## API Endpoints

### Public Endpoints

**GET /api/events**
- Fetches published events with optional filters
- Query params:
  - `status=upcoming` - Only future events
  - `status=past` - Only past events  
  - `type={type}` - Filter by event type
  - `talentId={id}` - Filter by talent
  - `q={query}` - Search events

**GET /api/events/{id-or-slug}**
- Fetches a single event by ID or slug

### Admin Endpoints (⚠️ Add auth before production)

**POST /api/events**
- Creates a new event
- Required fields: title, description, type, start_time, venue

**PUT /api/events/{id-or-slug}**
- Updates an existing event
- All fields optional

**DELETE /api/events/{id-or-slug}**
- Permanently deletes an event

## How the Homepage is Populated

The homepage "Featured Events" section:

1. Fetches upcoming events (`/api/events?status=upcoming`)
2. Filters for `featured = true`  
3. Limits to 3 events
4. Displays event image, title, date, time, venue

**To feature an event on homepage:**
- Set `featured = true` when creating/editing
- Ensure `is_published = true`
- Ensure event is upcoming

## Admin Interface

### Creating Events

1. Navigate to `/admin/events`
2. Click "Create Event"
3. Fill in the form:
   - Title (required)
   - Description (required)
   - Event Type (required)
   - Start Date/Time (required)
   - End Date/Time (optional but recommended)
   - Venue details (required)
   - Image URL (optional)
   - Tickets URL (optional)
   - Price information (optional)
   - Featured (checkbox)
   - Published (checkbox)
4. Click "Create Event"

### Editing Events

1. Find event in `/admin/events` list
2. Click edit icon
3. Update fields
4. Click "Update Event"

### Deleting Events

1. Click delete icon on event
2. Confirm deletion
3. Event is permanently removed

## Installation

### 1. Run Database Migration

Execute in Neon Console:
```sql
-- See /src/db/migrations/004_events_system.sql
```

This creates the events table, indexes, triggers, and inserts sample data.

### 2. Verify

```sql
SELECT title, start_time, 
  CASE 
    WHEN end_time >= NOW() THEN 'upcoming'
    ELSE 'past'
  END as status
FROM events
ORDER BY start_time DESC;
```

### 3. Test

- Visit `/events` to see public events page
- Visit `/admin/events` to manage events
- Check homepage for featured events

## Migration from Static Data

The old file-based events system has been replaced with the database. Sample events are included in the migration.

To migrate your own events:
1. Export existing events from `/src/lib/data/events.ts`
2. Insert into database via admin UI or SQL
3. Verify on frontend

## Best Practices

**✅ DO:**
- Set realistic start and end times
- Mark important events as featured (limit 3-5)
- Use high-quality images
- Include ticket links when available
- Set `is_published = false` for draft events
- Set `end_time` for proper past/upcoming classification

**❌ DON'T:**
- Feature too many events (overwhelms homepage)
- Leave `end_time` null (event never becomes "past")
- Forget to un-feature past events
- Publish incomplete event data

## Troubleshooting

**Events not showing on homepage?**
- Check `featured = true`
- Check `is_published = true`  
- Check event is upcoming (`end_time >= NOW()`)
- Max 3 featured events shown

**Event showing as past when it's upcoming?**
- Check `end_time` is in the future
- Refresh page (status calculated real-time)

**Cannot create event?**
- Ensure all required fields provided
- Check venue is valid JSON object
- Verify event type is valid

## Related Systems

- **VIP System** - VIP members can access exclusive events
- **NFC System** - Track check-ins at events via NFC cards
- **Talent System** - Link events to specific talent

---

**Version:** 1.0  
**Created:** December 2024  
**System:** VersaTalent Events Management Platform
