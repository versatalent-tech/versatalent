# 🚀 Events System Deployment Guide

## Quick Start

You've successfully migrated the VersaTalent Events system from file storage to Neon PostgreSQL!

### ✅ What's Complete

- Database migration file created with schema, indexes, triggers
- TypeScript types added for Event model
- Repository functions for all CRUD operations
- API routes refactored to use database
- Homepage and Events page updated to fetch from database
- Real-time upcoming/past classification
- Admin UI already exists and ready to use
- Comprehensive documentation written

### ⏳ What's Next

**CRITICAL:** Run the database migration in your Neon Console before testing!

---

## Step 1: Run Database Migration

### In Neon Console:

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your VersaTalent database
3. Open SQL Editor
4. Copy the entire contents of:
   ```
   versatalent/src/db/migrations/004_events_system.sql
   ```
5. Paste into SQL Editor
6. Click "Run" or press Cmd/Ctrl + Enter
7. Verify success - should see:
   - ✅ Table created
   - ✅ Indexes created
   - ✅ Triggers created
   - ✅ 3 sample events inserted

### Verify Migration:

Run this query to confirm:

```sql
SELECT 
  id, 
  title, 
  type,
  start_time,
  CASE 
    WHEN end_time >= NOW() THEN 'upcoming'
    ELSE 'past'
  END as status,
  featured,
  is_published
FROM events
ORDER BY start_time DESC;
```

**Expected Result:** 3 events (2 past, 1 upcoming)

---

## Step 2: Test the System

### A. Test Public Pages

**Homepage:**
1. Visit: http://localhost:3000 (or your deployed URL)
2. Scroll to "Featured Events" section
3. ✅ Should show upcoming featured event(s)
4. If no events show, check:
   - Are events marked `featured = true`?
   - Are events `is_published = true`?
   - Are events upcoming (`end_time >= NOW()`)?

**Events Page:**
1. Visit: http://localhost:3000/events
2. ✅ Should see two sections:
   - "Upcoming Events" (sorted soonest first)
   - "Past Events" (sorted most recent first)
3. ✅ Search bar works
4. ✅ Filter buttons work (All, Performances, etc.)

### B. Test Admin Interface

**Access:**
1. Visit: http://localhost:3000/admin/events
2. ✅ Should see list of all events

**Create Event:**
1. Click "Create Event"
2. Fill in:
   - Title: "Test Event"
   - Description: "Testing events system"
   - Type: Performance
   - Start Time: Tomorrow's date + time
   - End Time: Tomorrow's date + 3 hours later
   - Venue: {name: "Test Venue", address: "123 Test St", city: "Test City", country: "USA"}
   - Featured: Yes
   - Published: Yes
3. Click "Create Event"
4. ✅ Event appears in list
5. ✅ Event appears on homepage (Featured Events)
6. ✅ Event appears in Events page (Upcoming section)

**Edit Event:**
1. Find your test event
2. Click edit icon
3. Change title to "Updated Test Event"
4. Click "Update Event"
5. ✅ Title updates everywhere

**Delete Event:**
1. Click delete icon on test event
2. Confirm deletion
3. ✅ Event removed from all pages

---

## Step 3: Understanding Upcoming vs Past

Events are classified **automatically in real-time** based on:

### Upcoming Event:
- `end_time >= NOW()` (event hasn't ended)
- OR `end_time IS NULL AND start_time >= NOW()`

### Past Event:
- `end_time < NOW()` (event has ended)

**Important:**
- The `status` field (upcoming/ongoing/completed/cancelled) is manual
- The actual classification is based on `end_time` comparison to NOW()
- Events automatically move from "Upcoming" to "Past" when `end_time` passes

**Example:**
```
Event: Summer Concert
Start: 2025-06-15 19:00:00
End: 2025-06-15 23:00:00

Before 2025-06-15 23:00:00 → Shows in "Upcoming"
After 2025-06-15 23:00:00 → Shows in "Past"
```

---

## Step 4: Populating the Homepage

The homepage shows **3 featured upcoming events**.

**To feature an event:**

1. When creating/editing an event, check:
   - ✅ `featured = true`
   - ✅ `is_published = true`
   - ✅ `end_time` is in the future

2. The homepage automatically:
   - Fetches: `/api/events?status=upcoming`
   - Filters: `featured = true`
   - Limits: First 3 events
   - Sorts: By `start_time` ASC (soonest first)

**Best Practice:**
- Feature 3-5 important upcoming events
- Un-feature events after they pass
- Rotate featured events regularly

---

## Step 5: API Endpoints Reference

### Public Endpoints

```bash
# Get all upcoming events
GET /api/events?status=upcoming

# Get all past events
GET /api/events?status=past

# Get all published events (default)
GET /api/events

# Filter by type
GET /api/events?type=performance

# Search events
GET /api/events?q=showcase

# Get single event
GET /api/events/{id-or-slug}
```

### Admin Endpoints

```bash
# Create event
POST /api/events
Body: {
  "title": "New Event",
  "description": "...",
  "type": "performance",
  "start_time": "2025-07-01T19:00:00Z",
  "end_time": "2025-07-01T23:00:00Z",
  "venue": {...},
  "featured": true
}

# Update event
PUT /api/events/{id}
Body: { "title": "Updated Title" }

# Delete event
DELETE /api/events/{id}
```

---

## Step 6: Common Issues & Fixes

### Issue: No events on homepage

**Check:**
```sql
SELECT title, featured, is_published, end_time
FROM events
WHERE featured = TRUE
AND is_published = TRUE
AND end_time >= NOW();
```

**Fix:**
```sql
-- Mark event as featured
UPDATE events
SET featured = TRUE
WHERE id = 'your-event-id';
```

### Issue: Event shows as past but should be upcoming

**Check:**
```sql
SELECT title, start_time, end_time, NOW()
FROM events
WHERE id = 'your-event-id';
```

**Fix:**
```sql
-- Update end_time to future
UPDATE events
SET end_time = '2025-07-01T23:00:00Z'
WHERE id = 'your-event-id';
```

### Issue: API returns 500 error

**Check:**
1. Database connection working?
2. Migration run successfully?
3. Check server logs for error details

**Fix:**
- Verify `DATABASE_URL` in `.env.local`
- Re-run migration if needed
- Check Neon dashboard for connection issues

---

## Step 7: Commit & Deploy

### Local Commit

```bash
cd versatalent
git add .
git commit -m "Migrate events system to Neon PostgreSQL database

- Create events table with full schema
- Refactor API routes to use database
- Update frontend to fetch from database  
- Add real-time upcoming/past classification
- Add comprehensive documentation"
```

### Push to GitHub

```bash
git push origin main
```

### Netlify Deployment

Netlify will auto-deploy on push. Ensure:
- ✅ `DATABASE_URL` set in Netlify environment variables
- ✅ Migration run in production Neon database
- ✅ Build succeeds

---

## Step 8: Post-Deployment Checklist

### Verify on Production:

- [ ] Homepage loads and shows featured events
- [ ] Events page displays upcoming and past events
- [ ] Search and filter work on events page
- [ ] Admin events page accessible
- [ ] Can create new event via admin
- [ ] Can edit existing event
- [ ] Can delete event
- [ ] Events automatically classify as upcoming/past

### Optional Enhancements:

- [ ] Add authentication to admin endpoints
- [ ] Add image upload functionality
- [ ] Add event categories/tags filtering
- [ ] Add calendar view
- [ ] Add event RSVP system
- [ ] Add analytics tracking

---

## Resources

**Documentation:**
- Main Guide: `EVENTS_SYSTEM_README.md`
- Migration File: `src/db/migrations/004_events_system.sql`
- Todos: `.same/todos.md`

**Key Files:**
- Types: `src/lib/db/types.ts`
- Repository: `src/lib/db/repositories/events.ts`
- API: `src/app/api/events/route.ts` + `[id]/route.ts`
- Homepage: `src/components/home/UpcomingEvents.tsx`
- Events Page: `src/app/events/page.tsx`
- Admin: `src/app/admin/events/page.tsx`

**Support:**
- Neon Docs: https://neon.tech/docs
- Next.js Docs: https://nextjs.org/docs
- Same Support: support@same.new

---

**Status:** ✅ **Events System Fully Migrated**

**Next Action:** Run the database migration in Neon Console, then test!

---

**Version:** 143  
**Date:** December 2024  
**System:** VersaTalent Events Management
