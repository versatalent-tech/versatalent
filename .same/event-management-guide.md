# 🎉 Event Management System - Complete Guide

## Overview

A comprehensive admin dashboard for creating, updating, and deleting events for your artists. The system includes:

- **Admin Dashboard** at `/admin/events`
- **Public Events Page** at `/events`
- **API Routes** for CRUD operations
- **JSON Data Storage** for persistence

---

## 🚀 Getting Started

### Access the Admin Dashboard

1. Navigate to: **http://localhost:3000/admin/events**
2. You'll see the Event Management dashboard with:
   - All existing events
   - Search and filter capabilities
   - Create, Edit, and Delete buttons

---

## 📋 Features

### 1. **View Events**

The main dashboard displays all events with:
- Event image and title
- Event type badge (Performance, Photoshoot, Match, etc.)
- Status badge (Upcoming, Ongoing, Completed, Cancelled)
- Date, time, and location
- Tags and pricing info
- Quick action buttons (Edit, Delete)

### 2. **Search & Filter**

- **Search Bar**: Find events by title, description, or city
- **Type Filter**: Filter by event type
  - All Types
  - Performance
  - Photoshoot
  - Match
  - Workshop
  - Appearance
  - Collaboration
- **Status Filter**: Filter by status
  - All Statuses
  - Upcoming
  - Ongoing
  - Completed
  - Cancelled

### 3. **Create New Event**

Click the **"Create Event"** button to open the creation dialog:

#### Basic Information
- **Event Title*** (required): "Summer Beats Festival 2025"
- **Description*** (required): Full event description
- **Event Type*** (required): Select from dropdown
- **Status*** (required): Upcoming/Ongoing/Completed/Cancelled
- **Date*** (required): Date and time picker
- **Time*** (required): Display time (e.g., "8:00 PM")

#### Venue Details
- **Venue Name*** (required): "Roundhay Park"
- **Address**: Full street address
- **City*** (required): "Leeds"
- **Country**: Default "UK"
- **Capacity**: Maximum attendance (optional)
- **Venue Website**: URL (optional)

#### Media & Talent
- **Event Image**: Upload directly from your computer
  - Click "Upload Image" button
  - Select JPEG, PNG, WebP, or GIF (max 5MB)
  - Preview appears automatically
  - Image stored in `/public/images/events/`
  - Click "Remove" to delete and choose another
- **Talent IDs**: Comma-separated talent IDs
  - Example: `1, 2, 3`
  - See available talents in the help text

#### Additional Details
- **Tags**: Comma-separated keywords
  - Example: `Festival, Music, Outdoor, Summer`
- **Pricing**:
  - Free Event checkbox
  - Min Price (if not free)
  - Max Price (optional)
  - Currency (default: GBP)
- **Tickets URL**: External ticket purchase link
- **Organizer**: Event organizer name
- **Expected Attendance**: Estimated number of attendees
- **Featured Event**: Checkbox to feature on homepage

### 4. **Edit Event**

Click the **"Edit"** button on any event card:
1. The edit dialog opens with all current values
2. Modify any fields you want to change
3. Click **"Save Changes"** to update
4. Changes appear immediately on the dashboard and public page

### 5. **Delete Event**

Click the **"Delete"** (trash icon) button:
1. A confirmation dialog appears
2. Shows event title and date for verification
3. Click **"Delete Event"** to confirm
4. Event is permanently removed from the system

---

## 🎯 Public Events Page

### URL: `/events`

The public-facing events page automatically displays:
- All events from the management system
- Real-time updates when you create/edit/delete events
- Search and filter capabilities for visitors
- Upcoming and completed events sections
- Featured events highlighted
- Individual event detail pages at `/events/[id]`

---

## 🔧 Technical Details

### API Routes

#### GET `/api/events`
- Fetches all events
- Query params:
  - `type`: Filter by event type
  - `status`: Filter by status
  - `talentId`: Filter by talent

#### POST `/api/events`
- Creates new event
- Body: EventItem object (without ID)
- Returns: Created event with generated ID

#### GET `/api/events/[id]`
- Fetches single event by ID
- Returns: EventItem or 404

#### PUT `/api/events/[id]`
- Updates existing event
- Body: Complete EventItem object
- Returns: Updated event

#### DELETE `/api/events/[id]`
- Deletes event by ID
- Returns: Success message

### Data Storage

Events are stored in: `src/lib/data/events-data.json`

The file is automatically created from static data on first run if it doesn't exist.

### Event Data Structure

```typescript
{
  id: string;
  title: string;
  description: string;
  type: 'performance' | 'photoshoot' | 'match' | 'collaboration' | 'workshop' | 'appearance';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  date: string; // ISO date string
  endDate?: string; // For multi-day events
  time: string;
  venue: {
    name: string;
    address: string;
    city: string;
    country: string;
    capacity?: number;
    website?: string;
  };
  talentIds: string[]; // References to talent IDs
  imageSrc: string;
  featured: boolean;
  ticketsUrl?: string;
  price?: {
    min: number;
    max?: number;
    currency: string;
    isFree?: boolean;
  };
  tags: string[];
  organizer?: string;
  expectedAttendance?: number;
}
```

---

## 💡 Tips & Best Practices

### Images
1. **Click "Upload Image"** in the event form
2. Select your image file (JPEG, PNG, WebP, or GIF)
3. Maximum file size: 5MB (recommended: under 500KB)
4. Recommended dimensions: 1200x800px (3:2 ratio)
5. Images are automatically saved to `/public/images/events/`
6. Preview appears immediately after upload
7. Click "Remove" to delete and upload a different image
8. Filename is automatically generated with timestamp

### Event Titles
- Be descriptive and specific
- Include year for recurring events
- Use title case: "Summer Beats Festival 2025"
- Keep under 80 characters for best display

### Descriptions
- Start with the most important information
- Include what makes the event unique
- Mention featured talent prominently
- Keep it engaging and concise (2-3 sentences ideal)

### Tags
- Use 3-5 relevant tags per event
- Include event type (Festival, Concert, Match)
- Add location tags (London, Leeds, UK)
- Include genre/category (Music, Fashion, Sports)
- Use consistent tag names across similar events

### Talent IDs
- View available talents: Check dashboard help text
- Current talents:
  - 1: Deejay WG
  - 2: Jessica Dias
  - 3: João Rodolfo
  - 4: Antonio Monteiro
- Multiple talents: `1, 2` for collaborations

### Featured Events
- Feature only your most important events
- Good for homepage highlights
- Limit to 3-5 featured events at a time
- Update regularly to keep homepage fresh

### Dates & Times
- Use future dates for upcoming events
- Set accurate times for automatic sorting
- Update status from 'upcoming' to 'completed' after events
- Archive old events or mark as 'completed'

### Pricing
- Check "Free Event" for no-cost events
- For paid events:
  - Set min price for cheapest ticket
  - Set max price for VIP/premium tickets
  - Helps visitors understand value
- Always include currency (GBP, USD, EUR)

---

## 🎨 Event Types Guide

### Performance
Live shows, concerts, DJ sets, musical performances
- Examples: Concerts, DJ sets, Live bands
- Best for: Music artists, performers

### Photoshoot
Photo sessions, editorial shoots, commercial photography
- Examples: Magazine shoots, Brand campaigns
- Best for: Models, influencers

### Match
Sports games, competitions, tournaments
- Examples: Football matches, Championships
- Best for: Athletes, sports talent

### Workshop
Educational sessions, masterclasses, training
- Examples: Production classes, Acting workshops
- Best for: Expert talent sharing knowledge

### Appearance
Guest appearances, speaking engagements, meet & greets
- Examples: Brand launches, Panel discussions
- Best for: Brand ambassadors, public figures

### Collaboration
Joint projects, partnerships, creative collaborations
- Examples: Brand partnerships, Creative projects
- Best for: Multi-talent events

---

## 🔍 Troubleshooting

### Events Not Showing
- Check filters are set to "All Types" and "All Statuses"
- Clear search bar
- Refresh the page
- Check events-data.json file exists

### Images Not Loading
- **For uploaded images**: Image should appear automatically
- **For manual paths**: Verify path starts with `/`
- Check image exists in `/public` directory
- Try relative path: `/images/event.jpg`
- Check file permissions

### Image Upload Fails
- Check file size is under 5MB
- Verify file type is JPEG, PNG, WebP, or GIF
- Ensure stable internet connection
- Try a different browser if issues persist
- Check browser console for specific errors

### Changes Not Appearing
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check API response in Network tab
- Verify events-data.json was updated
- Restart dev server if needed

### Creating Event Fails
- Fill all required fields (marked with *)
- Ensure date is in valid format
- Check talent IDs are valid numbers
- Verify venue name and city are provided

---

## 📱 Navigation

### Access Points
- **Admin Events**: `/admin/events`
- **Public Events**: `/events`
- **Individual Event**: `/events/[id]`
- **API Endpoint**: `/api/events`

### Adding to Navigation
The admin events page can be accessed directly via URL. To add it to your site navigation, update the Header component with an admin menu.

---

## ✅ Quick Start Checklist

- [ ] Navigate to `/admin/events`
- [ ] Click "Create Event"
- [ ] Fill in event title and description
- [ ] Select event type and status
- [ ] Set date and time
- [ ] Add venue details
- [ ] Upload and link event image
- [ ] Add talent IDs
- [ ] Include relevant tags
- [ ] Set pricing information
- [ ] Click "Create Event"
- [ ] View event on public page `/events`

---

## 🎉 You're Ready!

Your event management system is fully operational. Create amazing events for your talent and watch them automatically appear on your public website!

Need help? Check the troubleshooting section or review the data structure guide.

**Happy Event Planning! 🎪**
