# Admin NFC Check-ins Management Guide

## Overview

The admin events page now includes full NFC check-in management capabilities, allowing you to enable/disable check-ins and view real-time attendance stats directly from the admin interface.

---

## Features Added

### ✅ **Visual Check-in Status**
Each event card now displays:
- **Status Badge**: Shows if check-ins are enabled (green) or disabled (gray)
- **Check-in Icon**: Visual indicator with checkmark or X icon

### ✅ **Real-time Stats Display**
When check-ins are enabled, you see:
- **Total Check-ins**: Number of NFC card taps at this event
- **Unique Attendees**: Number of different VIP members who checked in

### ✅ **One-Click Toggle**
- **Enable Check-ins**: Single button to enable NFC tracking
- **Disable Check-ins**: Single button to disable (preserves history)

---

## How to Use

### **Accessing the Admin Page**

1. Navigate to: http://localhost:3000/admin/events
2. You'll see a list of all events
3. Each event card shows check-in status and controls

---

### **Enable NFC Check-ins for an Event**

#### Step 1: Find Your Event
Scroll through the events list or use search/filters to find the event.

#### Step 2: Click "Enable Check-ins"
In the "NFC Check-ins" section of the event card, click the button:
```

 👥 NFC Check-ins         ⚫ Disabled    │

 [ ✓ Enable Check-ins ]                 │

```

#### Step 3: Confirmation
You'll see a success message: **"Check-ins enabled!"**

The card updates to show:
```

 👥 NFC Check-ins         🟢 Enabled     │

 Total Check-ins: 0                      │
 Unique Attendees: 0                     │

 [ ✗ Disable Check-ins ]                │

```

#### What Happens Behind the Scenes:
1. Creates a linked `nfc_event` in the database
2. Syncs event details (title, date, venue)
3. Enables the event for NFC card check-ins
4. VIP members can now tap their NFC cards at the event

---

### **View Check-in Stats**

Once check-ins are enabled and VIP members start checking in:

**Stats Update Automatically:**
```

 👥 NFC Check-ins         🟢 Enabled     │

 Total Check-ins: 47                     │
 Unique Attendees: 35                    │

```

**Stats Explained:**
- **Total Check-ins (47)**: Total number of NFC taps (some VIPs may check in multiple times)
- **Unique Attendees (35)**: Number of different VIP members who attended

**Refresh Stats:**
- Reload the page to see updated numbers
- Stats are fetched from the database on each page load

---

### **Disable NFC Check-ins**

#### When to Disable:
- Event has ended
- Want to stop accepting new check-ins
- Need to freeze attendance numbers

#### How to Disable:

Click the **"Disable Check-ins"** button in the event card.

#### What Happens:
- Check-ins are stopped (no new taps accepted)
- **History is preserved** (existing check-in data NOT deleted)
- Badge changes to "Disabled"
- Stats remain visible

#### Important Notes:
- ✅ **Check-in history is preserved** - You can still see past stats
- ✅ **Can re-enable later** - Click "Enable Check-ins" again
- ✅ **VIP points already earned are NOT affected**

---

## Visual Guide

### **Event Card with Check-ins Disabled**

```

  VersaTalent Summer Showcase 2025                    │
  ⭐ Featured  🎤 Performance  ⏰ Upcoming             │

  📅 Start: Jun 15, 2025 7:00 PM                      │
  📍 The Hanover Theatre, Worcester, USA              │
  🎫 $25 - $75                                        │

  🏷️ Performance, Showcase, Fashion, Music           │

  👥 NFC Check-ins                    ⚫ Disabled     │
                                                       │
  [ ✓ Enable Check-ins ]                             │

  [ Edit ] [ Delete ]                                 │

```

### **Event Card with Check-ins Enabled (With Stats)**

```

  VersaTalent Summer Showcase 2025                    │
  ⭐ Featured  🎤 Performance  ⏰ Upcoming             │

  📅 Start: Jun 15, 2025 7:00 PM                      │
  📍 The Hanover Theatre, Worcester, USA              │
  🎫 $25 - $75                                        │

  🏷️ Performance, Showcase, Fashion, Music           │

  👥 NFC Check-ins                    🟢 Enabled      │
                                                       │
  Total Check-ins: 125                                │
  Unique Attendees: 98                                │
                                                       │
  [ ✗ Disable Check-ins ]                            │

  [ Edit ] [ Delete ]                                 │

```

---

## Workflow Examples

### **Scenario 1: Setting Up a New Event with Check-ins**

1. **Create Event** via admin UI
   - Click "Create Event"
   - Fill in all details (title, date, venue, etc.)
   - Click "Create Event"

2. **Enable Check-ins** (on the events list page)
   - Find your newly created event
   - Click "Enable Check-ins" button
   - Success message appears

3. **At the Event** (day of)
   - VIP members tap their NFC cards at entrance
   - Check-ins are logged automatically
   - Points awarded to VIP members

4. **Monitor Stats** (during or after event)
   - Reload admin events page
   - See real-time attendance numbers
   - Total check-ins and unique attendees

5. **Close Event** (after event ends)
   - Click "Disable Check-ins"
   - Stats are frozen
   - Check-in data preserved for reporting

---

### **Scenario 2: Enabling Check-ins for Existing Event**

1. **Navigate** to `/admin/events`
2. **Find** the existing event (use search if needed)
3. **Click** "Enable Check-ins" button
4. **Confirm** success message
5. **Ready** - Event now accepts NFC check-ins

---

### **Scenario 3: Viewing Historical Check-in Data**

1. **Navigate** to `/admin/events`
2. **Find** the past event
3. **View Stats** even if check-ins are disabled:
   - Total check-ins: XX
   - Unique attendees: XX
4. **Re-enable** if needed (for late arrivals)

---

## Technical Details

### **What Happens When You Enable Check-ins:**

1. **API Call**: `POST /api/events/{eventId}/checkins`
2. **Database Action**: 
   - Creates entry in `nfc_events` table
   - Links to main event via `event_id` foreign key
   - Copies event details (title, date, venue)
3. **Result**: 
   - Event ID returned
   - Check-in tracking active

### **What Happens When You Disable Check-ins:**

1. **API Call**: `DELETE /api/events/{eventId}/checkins`
2. **Database Action**:
   - Sets `nfc_events.is_active = FALSE`
   - **Does NOT delete** the nfc_event record
   - **Does NOT delete** check-in history
3. **Result**:
   - New check-ins blocked
   - Historical data preserved

### **Stats Data Source:**

Stats are fetched from the `events_with_checkins` view:
```sql
SELECT 
  title,
  nfc_event_id,
  checkins_enabled,
  total_checkins,
  unique_attendees
FROM events_with_checkins
WHERE id = 'event-id';
```

---

## Troubleshooting

### **"Enable Check-ins" button doesn't work**

**Check:**
1. Is dev server running? (`bun run dev`)
2. Did migrations 004 & 005 run successfully?
3. Check browser console for errors

**Fix:**
```bash
# Restart dev server
cd versatalent
bun run dev
```

### **Stats show 0 even though people checked in**

**Check:**
1. Reload the page (stats fetch on load)
2. Verify check-ins in database:
   ```sql
   SELECT * FROM events_with_checkins WHERE title LIKE '%event name%';
   ```

**Fix:**
- Force refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### **Button shows "Enabled" but stats are 0**

**This is normal if:**
- Check-ins were just enabled
- No VIP members have checked in yet
- Event hasn't started yet

**Verify:**
```sql
SELECT * FROM nfc_events WHERE event_id = 'your-event-id';
```

### **Success message doesn't appear**

**Check:**
- Browser console for errors
- Network tab shows 200 response

**Temporary workaround:**
- Reload page manually to see updated status

---

## Best Practices

### ✅ **DO:**
- Enable check-ins **before** the event starts
- Monitor stats **during** the event
- Disable check-ins **after** event ends (optional)
- Keep check-ins enabled for multi-day events
- Re-enable if you expect late arrivals

### ❌ **DON'T:**
- Don't delete events with check-in history (data loss)
- Don't rapidly enable/disable (unnecessary API calls)
- Don't expect instant stat updates (requires page reload)

### 📊 **Recommended Workflow:**
1. Create event 1-2 weeks before
2. Enable check-ins 24 hours before event
3. Monitor stats during event
4. Leave enabled for 24 hours after (late entries)
5. Disable check-ins to freeze numbers
6. Keep event published for historical record

---

## Database Schema

### **Linked Tables:**

```
events table (public events)
  ↓ event_id (foreign key)
nfc_events table (check-in tracking)
  ↓ event_id (foreign key)
checkins table (individual taps)
  ↓ user_id (foreign key)
vip_memberships table (VIP member data)
```

### **Data Flow:**

1. Admin enables check-ins → Creates `nfc_event`
2. VIP taps NFC card → Creates `checkin` record
3. System awards points → Updates `vip_memberships`
4. Admin views stats → Queries `events_with_checkins` view

---

## Related Documentation

- **API Endpoints**: `/api/events/[id]/checkins` (GET, POST, DELETE)
- **Integration Guide**: `EVENTS_INTEGRATION_GUIDE.md`
- **Database Migrations**: `004_events_system.sql`, `005_integrate_events_systems.sql`
- **Testing Guide**: `test-events-integration.md`

---

## FAQ

**Q: Can I enable check-ins for past events?**  
A: Yes! Useful if you forgot to enable before the event, or need to manually log check-ins.

**Q: What happens if I delete an event with check-ins?**  
A: The event and its `nfc_event` are deleted, BUT check-in records are preserved (they just lose the event reference).

**Q: Can I enable check-ins for multiple events at once?**  
A: Not currently - must enable one at a time. (Future enhancement idea!)

**Q: Do stats update in real-time?**  
A: No - stats are fetched on page load. Reload the page to see updated numbers.

**Q: Can I export check-in data?**  
A: Not from the UI currently, but you can query the database directly for CSV export.

---

**Version:** 146  
**Feature:** NFC Check-in Management in Admin UI  
**Status:** ✅ Live and Ready to Use

---

**Need help?** Check the troubleshooting section or review `EVENTS_INTEGRATION_GUIDE.md` for more details!
