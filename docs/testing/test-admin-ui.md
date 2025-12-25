# Admin UI Testing Guide - Add Talents & Events

**Version:** 172
**Date:** December 15, 2025
**Prerequisites:** Dev server running at http://localhost:3000

---

## 🎯 Overview

This guide provides step-by-step instructions for testing the admin UI, specifically:
1. Adding a new talent through the UI
2. Adding a new event through the UI
3. Verifying the data was saved correctly

---

## 🔐 Part 1: Admin Login

### Test 1.1: Login to Admin Panel

**Steps:**
1. Open browser to http://localhost:3000/admin/login
2. Enter credentials:
   - **Username:** `admin`
   - **Password:** `changeme`
3. Click **"Sign In"** button

**Expected Results:**
- ✅ Login form accepts credentials
- ✅ No error messages appear
- ✅ Redirects to `/admin` dashboard
- ✅ Can see admin navigation/menu

**Screenshot Checkpoint:** You should see the admin dashboard

---

## 👤 Part 2: Add Talent via UI

### Test 2.1: Navigate to Talent Management

**Steps:**
1. From admin dashboard, navigate to http://localhost:3000/admin/talents
2. Observe the page loads

**Expected Results:**
- ✅ Page loads without errors
- ✅ Can see "Talent Management" header
- ✅ Can see "Add New Talent" button
- ✅ Can see search bar and filters
- ✅ Grid shows existing talents (if any)

**Screenshot Checkpoint:** Talent management page loaded

---

### Test 2.2: Open Create Talent Dialog

**Steps:**
1. Click the **"Add New Talent"** button (gold button in top right)

**Expected Results:**
- ✅ Dialog opens with title "Add New Talent"
- ✅ Form shows all required fields:
  - Name
  - Profession
  - Industry dropdown
  - Gender dropdown
  - Age Group dropdown
  - Location
  - Tagline
  - Bio (multiline)
  - Skills
  - Image section
  - Social Links section
  - Portfolio Management section
  - Featured checkbox
  - Active checkbox
- ✅ "Cancel" and "Add Talent" buttons visible

**Screenshot Checkpoint:** Create talent dialog open

---

### Test 2.3: Fill in Basic Information

**Steps:**
1. Fill in the following fields:

```
Name: Test Talent UI
Profession: Test Performer
Industry: Music (select from dropdown)
Gender: Male (select from dropdown)
Age Group: Adult (select from dropdown)
Location: Manchester, UK
Tagline: Professional test performer for UI testing
Bio: This is a test talent created to verify the admin UI works correctly. This talent has all required fields filled in and should save successfully to the database.
Skills: Testing, UI Verification, QA
```

**Expected Results:**
- ✅ All fields accept input
- ✅ Dropdowns work correctly
- ✅ Text areas expand as needed
- ✅ No validation errors while typing

**Screenshot Checkpoint:** Form partially filled

---

### Test 2.4: Add Profile Image

**Steps:**
1. Scroll to "Profile Image" section
2. Enter an image URL in the input field:
   ```
   https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400
   ```
3. Wait for image preview to load

**Expected Results:**
- ✅ URL input field visible
- ✅ Can paste URL
- ✅ Image preview appears below input
- ✅ Preview shows the actual image

**Alternative Test (if image doesn't load):**
- Try this URL: `https://picsum.photos/400/600`

**Screenshot Checkpoint:** Image preview visible

---

### Test 2.5: Add Social Links

**Steps:**
1. Scroll to "Social Links" section
2. Fill in (at least 2):
   ```
   Instagram: https://instagram.com/testtalent
   Twitter: https://twitter.com/testtalent
   YouTube: https://youtube.com/testtalent
   Website: https://testtalent.com
   ```

**Expected Results:**
- ✅ All fields accept URLs
- ✅ No validation errors
- ✅ Optional fields (can leave empty)

**Screenshot Checkpoint:** Social links filled

---

### Test 2.6: Add Portfolio Items

**Steps:**
1. Scroll to "Portfolio Management" section
2. Click **"Add Portfolio Item"** button
3. Fill in the portfolio item form:
   ```
   Title: Test Portfolio Item
   Description: Sample portfolio piece for testing
   Type: Image (select from dropdown)
   URL: https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400
   Category: Performance
   ```
4. Check **"Featured"** checkbox
5. Check **"Professional"** checkbox
6. Click **"Save"** or **"Add"** (depending on UI)

**Expected Results:**
- ✅ Portfolio item form appears
- ✅ All fields work correctly
- ✅ Can save portfolio item
- ✅ Portfolio item appears in list
- ✅ Can see the image thumbnail

**Screenshot Checkpoint:** Portfolio item added

---

### Test 2.7: Set Featured and Active Status

**Steps:**
1. Scroll to bottom of form
2. Check the following checkboxes:
   - ☑ **Featured Talent** (displayed prominently on homepage)
   - ☑ **Active** (visible on site)

**Expected Results:**
- ✅ Both checkboxes can be toggled
- ✅ Both are checked

**Screenshot Checkpoint:** Checkboxes selected

---

### Test 2.8: Submit the Form

**Steps:**
1. Review all entered information
2. Click **"Add Talent"** button at bottom right
3. Wait for response

**Expected Results:**
- ✅ Button shows "Adding..." state (disabled with loading indicator)
- ✅ After 1-3 seconds, success occurs
- ✅ **CRITICAL:** Dialog appears showing user credentials:
   - Name: Test Talent UI
   - Email: test-talent-ui@versatalent.com (or similar auto-generated)
   - Password: [random generated password]
   - **COPY THIS PASSWORD!**
- ✅ Success message appears: "Talent profile created successfully!"
- ✅ Dialog closes
- ✅ New talent appears in grid

**Screenshot Checkpoint:** Success message and credentials dialog

**⚠️ IMPORTANT:** Copy the displayed password! It's only shown once.

---

### Test 2.9: Verify Talent in Grid

**Steps:**
1. Look at the talents grid
2. Find the newly created "Test Talent UI"
3. Verify all information displays correctly

**Expected Results:**
- ✅ Talent card visible in grid
- ✅ Profile image shows
- ✅ Name displays: "Test Talent UI"
- ✅ Profession shows: "Test Performer"
- ✅ Location shows: "Manchester, UK"
- ✅ Tagline visible (may be truncated)
- ✅ "Music" industry badge visible
- ✅ "Featured" badge visible (gold background)
- ✅ Skills show (at least 3, or +X more)
- ✅ Action buttons visible: Edit, Reset Password, Delete, Unfeature, Deactivate

**Screenshot Checkpoint:** New talent card in grid

---

### Test 2.10: Edit the Talent

**Steps:**
1. Click **"Edit"** button on the "Test Talent UI" card
2. Modify the profession field:
   ```
   Profession: Test Performer (Edited)
   ```
3. Click **"Save Changes"**

**Expected Results:**
- ✅ Edit dialog opens with pre-filled data
- ✅ All original data shows correctly
- ✅ Portfolio items show in edit dialog
- ✅ Can modify fields
- ✅ "Save Changes" button works
- ✅ Success message: "Talent profile updated successfully!"
- ✅ Dialog closes
- ✅ Card updates with new profession

**Screenshot Checkpoint:** Updated talent card

---

### Test 2.11: Search for the Talent

**Steps:**
1. In the search box at top, type: `Test Talent`
2. Observe filtering

**Expected Results:**
- ✅ Search filters results in real-time
- ✅ Only "Test Talent UI" shows
- ✅ Other talents hidden

**Screenshot Checkpoint:** Search results filtered

---

### Test 2.12: Filter by Industry

**Steps:**
1. Clear search box
2. Select **"Music"** from Industry filter dropdown
3. Observe filtering

**Expected Results:**
- ✅ Only Music industry talents show
- ✅ "Test Talent UI" visible (is Music)
- ✅ Other industries hidden

**Screenshot Checkpoint:** Filter applied

---

### Test 2.13: Database Verification

**Steps:**
1. Open terminal
2. Run this command:
   ```bash
   psql $DATABASE_URL -c "SELECT id, name, profession, industry, featured, is_active FROM talents WHERE name = 'Test Talent UI';"
   ```

**Expected Results:**
- ✅ Query returns 1 row
- ✅ Name: `Test Talent UI`
- ✅ Profession: `Test Performer (Edited)`
- ✅ Industry: `music`
- ✅ Featured: `true`
- ✅ Is Active: `true`

**Terminal Output Checkpoint:**
```
                  id                  |      name       |       profession        | industry | featured | is_active
--------------------------------------+-----------------+-------------------------+----------+----------+-----------
 <some-uuid>                          | Test Talent UI  | Test Performer (Edited) | music    | t        | t
(1 row)
```

---

## 🎉 Part 3: Add Event via UI

### Test 3.1: Navigate to Event Management

**Steps:**
1. Navigate to http://localhost:3000/admin/events
2. Observe page loads

**Expected Results:**
- ✅ Page loads without errors
- ✅ Can see "Event Management" header
- ✅ Can see "Create Event" button
- ✅ Can see search bar and filters
- ✅ Grid shows existing events (if any)

**Screenshot Checkpoint:** Event management page loaded

---

### Test 3.2: Open Create Event Dialog

**Steps:**
1. Click the **"Create Event"** button (gold button in top right)

**Expected Results:**
- ✅ Dialog opens with title "Create New Event"
- ✅ Form shows all sections:
  - Event Title
  - Description
  - Event Type dropdown
  - Status dropdown
  - Start Date & Time
  - Display Time
  - Venue Details section
  - Event Image section
  - Talent IDs
  - Tags
  - Pricing section
  - Additional Options
- ✅ "Cancel" and "Create Event" buttons visible

**Screenshot Checkpoint:** Create event dialog open

---

### Test 3.3: Fill in Event Details

**Steps:**
1. Fill in basic information:

```
Event Title: Test Music Festival 2025
Description: This is a comprehensive test event created to verify the admin UI functionality. It includes all required fields and should save successfully to the database with venue, pricing, and talent information.
Event Type: Performance (select from dropdown)
Status: Upcoming (select from dropdown)
```

**Expected Results:**
- ✅ Title field accepts input
- ✅ Description textarea expands
- ✅ Dropdowns work correctly
- ✅ No errors while typing

**Screenshot Checkpoint:** Basic info filled

---

### Test 3.4: Set Date and Time

**Steps:**
1. Click on **"Start Date & Time"** field
2. Select a future date (e.g., March 15, 2026)
3. Select time (e.g., 20:00 / 8:00 PM)
4. In **"Display Time"** field, enter:
   ```
   8:00 PM - 2:00 AM
   ```

**Expected Results:**
- ✅ Date picker opens
- ✅ Can select future date and time
- ✅ Display time field accepts text
- ✅ Selected date shows in field

**Screenshot Checkpoint:** Date and time set

---

### Test 3.5: Fill in Venue Details

**Steps:**
1. Scroll to "Venue Details" section
2. Fill in:
   ```
   Venue Name: Test Arena Manchester
   Address: 123 Test Street
   City: Manchester
   Country: UK
   Capacity: 5000
   Venue Website: https://testarena.com
   ```

**Expected Results:**
- ✅ All venue fields accept input
- ✅ Capacity accepts numbers only
- ✅ Website accepts URL

**Screenshot Checkpoint:** Venue details filled

---

### Test 3.6: Add Event Image

**Steps:**
1. Scroll to "Event Image" section
2. Enter image URL:
   ```
   https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800
   ```
3. Wait for preview

**Expected Results:**
- ✅ URL input visible
- ✅ Image preview loads
- ✅ Preview shows concert/music image

**Screenshot Checkpoint:** Event image preview

---

### Test 3.7: Add Talent IDs

**Steps:**
1. Scroll to "Talent IDs" section
2. Get the UUID of "Test Talent UI" from previous test:
   ```bash
   psql $DATABASE_URL -c "SELECT id FROM talents WHERE name = 'Test Talent UI';"
   ```
3. Copy the UUID
4. Paste it into the "Talent IDs" field

**Example:**
```
abc123-def456-ghi789 (your actual UUID)
```

**Expected Results:**
- ✅ Field accepts comma-separated UUIDs
- ✅ Helper text shows available talents
- ✅ No validation errors

**Screenshot Checkpoint:** Talent ID added

---

### Test 3.8: Add Tags

**Steps:**
1. In the "Tags" field, enter:
   ```
   Music, Festival, Outdoor, Family-Friendly, Test Event
   ```

**Expected Results:**
- ✅ Field accepts comma-separated values
- ✅ No errors

**Screenshot Checkpoint:** Tags entered

---

### Test 3.9: Set Pricing

**Steps:**
1. Scroll to "Pricing" section
2. **UNCHECK** "Free Event" checkbox
3. Fill in:
   ```
   Min Price: 25
   Max Price: 75
   Currency: GBP
   ```

**Expected Results:**
- ✅ Unchecking "Free Event" reveals price fields
- ✅ Min and Max price fields accept numbers
- ✅ Currency field shows "GBP"

**Screenshot Checkpoint:** Pricing configured

---

### Test 3.10: Set Additional Options

**Steps:**
1. Scroll to bottom
2. Fill in:
   ```
   Tickets URL: https://ticketmaster.com/test-event
   Organizer: Test Productions Ltd
   Expected Attendance: 3000
   ```
3. Check these boxes:
   - ☑ **Featured Event** (displayed prominently on homepage)
   - ☑ **Published** (visible on site)

**Expected Results:**
- ✅ All fields accept input
- ✅ Checkboxes can be toggled
- ✅ Both boxes checked

**Screenshot Checkpoint:** All options filled

---

### Test 3.11: Submit the Event Form

**Steps:**
1. Review all entered information
2. Click **"Create Event"** button
3. Wait for response

**Expected Results:**
- ✅ Button shows "Saving..." state
- ✅ After 1-3 seconds, success message appears:
  "Event created successfully!"
- ✅ Dialog closes
- ✅ New event appears in grid

**Screenshot Checkpoint:** Success message

---

### Test 3.12: Verify Event in Grid

**Steps:**
1. Look at the events grid
2. Find "Test Music Festival 2025"
3. Verify all information

**Expected Results:**
- ✅ Event card visible
- ✅ Event image shows
- ✅ Title: "Test Music Festival 2025"
- ✅ Description visible (may be truncated)
- ✅ "Upcoming" status badge (blue/default)
- ✅ Date shows: "15 Mar 2026" (or your date)
- ✅ Time shows: "8:00 PM - 2:00 AM"
- ✅ Location: "Manchester, UK"
- ✅ Type: "performance"
- ✅ Tags visible (up to 3 + count)
- ✅ "Featured" badge visible
- ✅ NFC Check-ins section shows "Disabled"
- ✅ Action buttons: Edit, Delete, Enable Check-ins

**Screenshot Checkpoint:** New event card

---

### Test 3.13: Enable NFC Check-ins

**Steps:**
1. On the "Test Music Festival 2025" card
2. Click **"Enable Check-ins"** button in NFC section

**Expected Results:**
- ✅ Button processes request
- ✅ Success message: "Check-ins enabled!"
- ✅ Badge changes to "Enabled" (green)
- ✅ Stats show: "Total Check-ins: 0, Unique Attendees: 0"
- ✅ Button changes to "Disable Check-ins"

**Screenshot Checkpoint:** Check-ins enabled

---

### Test 3.14: Edit the Event

**Steps:**
1. Click **"Edit"** button on event card
2. Modify the title:
   ```
   Event Title: Test Music Festival 2025 (Updated)
   ```
3. Change expected attendance:
   ```
   Expected Attendance: 4500
   ```
4. Click **"Save Changes"**

**Expected Results:**
- ✅ Edit dialog opens with all pre-filled data
- ✅ All sections show original values
- ✅ Venue details preserved
- ✅ Pricing preserved
- ✅ Tags preserved
- ✅ Can modify fields
- ✅ Success message: "Event updated successfully!"
- ✅ Card updates with new title

**Screenshot Checkpoint:** Updated event card

---

### Test 3.15: Search for the Event

**Steps:**
1. In search box, type: `Test Music`
2. Observe filtering

**Expected Results:**
- ✅ Search filters in real-time
- ✅ Only "Test Music Festival 2025 (Updated)" shows
- ✅ Other events hidden

**Screenshot Checkpoint:** Search filtered

---

### Test 3.16: Filter by Type and Status

**Steps:**
1. Clear search
2. Select **"Performance"** from Type filter
3. Select **"Upcoming"** from Status filter

**Expected Results:**
- ✅ Only performance events show
- ✅ Only upcoming events show
- ✅ "Test Music Festival 2025 (Updated)" visible
- ✅ Filters work together

**Screenshot Checkpoint:** Multiple filters applied

---

### Test 3.17: Database Verification

**Steps:**
1. Open terminal
2. Run:
   ```bash
   psql $DATABASE_URL -c "SELECT id, title, type, status, featured, is_published FROM events WHERE title LIKE 'Test Music Festival%';"
   ```

**Expected Results:**
- ✅ Query returns 1 row
- ✅ Title: `Test Music Festival 2025 (Updated)`
- ✅ Type: `performance`
- ✅ Status: `upcoming`
- ✅ Featured: `true`
- ✅ Is Published: `true`

**Terminal Checkpoint:**
```
                  id                  |              title               |    type     |  status  | featured | is_published
--------------------------------------+----------------------------------+-------------+----------+----------+--------------
 <some-uuid>                          | Test Music Festival 2025 (Upda.. | performance | upcoming | t        | t
(1 row)
```

---

### Test 3.18: Verify Venue Data

**Steps:**
```bash
psql $DATABASE_URL -c "SELECT venue FROM events WHERE title LIKE 'Test Music Festival%';"
```

**Expected Results:**
- ✅ Returns JSON object with:
  - name: "Test Arena Manchester"
  - address: "123 Test Street"
  - city: "Manchester"
  - country: "UK"
  - capacity: 5000
  - website: "https://testarena.com"

---

### Test 3.19: Verify Pricing Data

**Steps:**
```bash
psql $DATABASE_URL -c "SELECT price FROM events WHERE title LIKE 'Test Music Festival%';"
```

**Expected Results:**
- ✅ Returns JSON object with:
  - min: 25
  - max: 75
  - currency: "GBP"
  - isFree: false

---

### Test 3.20: Verify Tags

**Steps:**
```bash
psql $DATABASE_URL -c "SELECT tags FROM events WHERE title LIKE 'Test Music Festival%';"
```

**Expected Results:**
- ✅ Returns array: `["Music", "Festival", "Outdoor", "Family-Friendly", "Test Event"]`

---

## 🔗 Part 4: Integration Testing

### Test 4.1: Verify Talent-Event Link

**Steps:**
1. Navigate to event detail page (if public page exists)
2. OR query database:
   ```bash
   psql $DATABASE_URL -c "SELECT talent_ids FROM events WHERE title LIKE 'Test Music Festival%';"
   ```

**Expected Results:**
- ✅ Event has talent_ids array
- ✅ Contains UUID of "Test Talent UI"

---

### Test 4.2: View Public Event Page

**Steps:**
1. Get event ID from database or URL
2. Navigate to: http://localhost:3000/events/[event-id]
3. Observe page

**Expected Results:**
- ✅ Event page loads
- ✅ Shows all event details
- ✅ Associated talent(s) displayed
- ✅ Venue information visible
- ✅ Pricing shown correctly
- ✅ Tags displayed

**Screenshot Checkpoint:** Public event page

---

### Test 4.3: View Public Talent Page

**Steps:**
1. Navigate to: http://localhost:3000/talents
2. Find "Test Talent UI"
3. Click on the card

**Expected Results:**
- ✅ Talent detail page loads
- ✅ Shows profile image
- ✅ Bio displayed
- ✅ Skills shown
- ✅ Portfolio items visible
- ✅ Social links clickable
- ✅ Upcoming events section (should show Test Music Festival)

**Screenshot Checkpoint:** Public talent page

---

## 🧹 Part 5: Cleanup (Optional)

### Test 5.1: Delete Test Event

**Steps:**
1. Go to http://localhost:3000/admin/events
2. Find "Test Music Festival 2025 (Updated)"
3. Click trash icon (🗑️)
4. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Shows event title and date
- ✅ Warning about irreversible action
- ✅ After confirmation: "Event deleted successfully!"
- ✅ Event removed from grid
- ✅ Database record deleted

---

### Test 5.2: Delete Test Talent

**Steps:**
1. Go to http://localhost:3000/admin/talents
2. Find "Test Talent UI"
3. Click trash icon (🗑️)
4. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Shows talent name and profession
- ✅ After confirmation: "Talent profile deleted successfully!"
- ✅ Talent removed from grid
- ✅ User account also deleted

---

## ✅ Testing Completion Checklist

### Talent UI Testing
- [ ] Can navigate to talent management page
- [ ] "Add New Talent" button opens dialog
- [ ] All form fields accept input
- [ ] Image upload/preview works
- [ ] Social links save correctly
- [ ] Portfolio items can be added
- [ ] Featured and Active toggles work
- [ ] Form submits successfully
- [ ] User credentials dialog shows
- [ ] New talent appears in grid
- [ ] Can edit talent
- [ ] Can search talents
- [ ] Can filter by industry
- [ ] Database contains correct data

### Event UI Testing
- [ ] Can navigate to event management page
- [ ] "Create Event" button opens dialog
- [ ] All form sections work
- [ ] Date/time picker functions
- [ ] Venue details save correctly
- [ ] Event image preview works
- [ ] Talent IDs input works
- [ ] Tags parse correctly
- [ ] Pricing configuration works (free/paid)
- [ ] Featured and Published toggles work
- [ ] Form submits successfully
- [ ] New event appears in grid
- [ ] NFC check-ins can be enabled
- [ ] Can edit event
- [ ] Can search events
- [ ] Can filter by type and status
- [ ] Database contains correct venue JSON
- [ ] Database contains correct pricing JSON
- [ ] Database contains correct tags array

### Integration
- [ ] Talent-event link works
- [ ] Public event page shows associated talents
- [ ] Public talent page shows upcoming events
- [ ] Can delete test data

---

## 📊 Expected Results Summary

**If all tests pass:**
- ✅ 40+ individual test steps completed
- ✅ 2 complete entities created (1 talent, 1 event)
- ✅ All CRUD operations verified
- ✅ Database integrity confirmed
- ✅ UI responsiveness verified
- ✅ Integration between talents and events working

**Success Criteria:**
- Zero errors during creation
- All data saves correctly to database
- All UI elements function as expected
- Search and filters work correctly
- Public pages display created content

---

## 🐛 Troubleshooting

### Issue: Dialog won't open
- **Check:** JavaScript console for errors
- **Fix:** Refresh page, try again

### Issue: Image won't load
- **Check:** Image URL is accessible
- **Try:** Different image URL from Unsplash

### Issue: Form won't submit
- **Check:** All required fields filled (marked with *)
- **Check:** Console for validation errors

### Issue: Talent/Event doesn't appear in grid
- **Check:** Active filters (search, industry, status)
- **Fix:** Clear all filters
- **Check:** Database query to verify it was created

### Issue: Database query fails
- **Check:** DATABASE_URL environment variable set
- **Check:** Database connection: `psql $DATABASE_URL -c "SELECT NOW();"`

---

## 📸 Screenshot Checklist

Take screenshots at these key points:
1. Admin login page
2. Talent management page loaded
3. Create talent dialog open
4. Talent form filled
5. New talent in grid
6. Event management page loaded
7. Create event dialog open
8. Event form filled
9. New event in grid
10. Public event page
11. Public talent page

---

**Test Duration:** 30-45 minutes for complete walkthrough
**Difficulty:** Easy to Moderate
**Status:** Ready for testing

🎉 **Happy Testing!**
