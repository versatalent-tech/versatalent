# VersaTalent NFC Membership System

## Overview

This document describes the complete NFC (Near Field Communication) membership system integrated into the VersaTalent platform. The system enables physical NFC cards to route users to digital profiles, manage VIP memberships, track event check-ins, and provide a comprehensive admin dashboard.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Setup](#database-setup)
3. [NFC Card Workflow](#nfc-card-workflow)
4. [User Roles & Access Levels](#user-roles--access-levels)
5. [API Endpoints](#api-endpoints)
6. [Frontend Pages](#frontend-pages)
7. [Admin Dashboard](#admin-dashboard)
8. [Getting Started](#getting-started)
9. [Common Workflows](#common-workflows)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Tech Stack
- **Database**: Neon PostgreSQL (serverless)
- **Backend**: Next.js API Routes
- **Frontend**: React + TypeScript + shadcn/ui
- **Authentication**: NextAuth.js (configured)
- **Package Manager**: Bun

### Core Components

```
versatalent/
 src/
   ├── app/
   │   ├── nfc/[card_uid]/          # NFC routing page
   │   ├── artist/[id]/              # Artist profile pages
   │   ├── vip/[id]/                 # VIP pass pages
   │   ├── admin/nfc/                # Admin NFC management
   │   └── api/
   │       └── nfc/                  # NFC API routes
   ├── lib/
   │   └── db/
   │       ├── client.ts             # Neon database client
   │       ├── types.ts              # TypeScript types
   │       └── repositories/         # Database access layer
   └── components/
       └── admin/nfc/                # Admin UI components
 src/db/migrations/                # SQL migration files
```

---

## Database Setup

### Step 1: Create Neon Database

1. Go to [Neon.tech](https://neon.tech) and create a new project
2. Copy your connection string
3. Create a `.env.local` file in the project root:

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 2: Run Database Migration

1. Open the Neon SQL Editor in your dashboard
2. Copy the contents of `src/db/migrations/001_initial_schema.sql`
3. Paste and execute the SQL script

This creates the following tables:
- `users` - User accounts (artists, VIPs, staff, admins)
- `nfc_cards` - NFC card registry
- `nfc_events` - Events for check-in tracking
- `checkins` - Check-in log with full audit trail

### Step 3: Verify Setup

Run this query in Neon SQL Editor:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see: `users`, `nfc_cards`, `nfc_events`, `checkins`

---

## NFC Card Workflow

### How It Works

1. **Physical NFC Tag**: Program an NFC tag with a URL:
   ```
   https://yourdomain.com/nfc/CARD-UID-HERE
   ```

2. **User Taps Card**: When tapped with a phone, the browser opens the URL

3. **System Validates**: 
   - Checks if `card_uid` exists in database
   - Verifies card is active
   - Retrieves associated user data

4. **Automatic Redirect**:
   - **Artist cards** → `/artist/{user_id or talent_id}`
   - **VIP cards** → `/vip/{user_id}`
   - **Staff cards** → `/admin?staff={user_id}`

5. **Check-in Logged**: System automatically creates a check-in record

### Programming NFC Tags

#### iOS (iPhone 7+)
1. Download "NFC Tools" app from App Store
2. Open app → Write → Add a Record → URL/URI
3. Enter: `https://yourdomain.com/nfc/YOUR-CARD-UID`
4. Tap "Write" and hold NFC tag near phone

#### Android
1. Download "NFC Tools" app from Play Store
2. Same process as iOS

**Important**: The `card_uid` in the URL must match the `card_uid` in your database!

---

## User Roles & Access Levels

### Artist
- Access to artist profile page
- Portfolio display
- Press kit download
- Booking information
- Check-ins logged as `artist_profile`

### VIP
- Access to VIP pass page
- View membership benefits
- Manual check-in button
- Event-specific check-ins
- Check-ins logged as `vip_pass`

### Staff
- Access to admin area
- Limited management capabilities
- Check-ins logged as `admin`

### Admin
- Full access to all features
- User management (CRUD)
- NFC card management (CRUD)
- Event management (CRUD)
- View all check-ins
- Analytics and reporting

---

## API Endpoints

### NFC Routes

#### `GET /api/nfc/{card_uid}`
Validate and retrieve NFC card data
- **Response**: Card info + user data (sanitized)
- **Status Codes**: 200 (OK), 404 (Not Found), 403 (Inactive)

### Users

#### `GET /api/nfc/users`
Get all users (or filter by role)
- **Query Params**: `?role=artist|vip|staff|admin`

#### `POST /api/nfc/users`
Create new user
- **Body**: `{ name, email, role, password?, avatar_url?, talent_id? }`

#### `GET /api/nfc/users/{id}`
Get user by ID

#### `PUT /api/nfc/users/{id}`
Update user

#### `DELETE /api/nfc/users/{id}`
Delete user

### NFC Cards

#### `GET /api/nfc/cards`
Get all NFC cards (with user data)

#### `POST /api/nfc/cards`
Create NFC card
- **Body**: `{ card_uid, user_id, type }`
- **Type**: `artist | vip | staff`

#### `PUT /api/nfc/cards/{id}`
Update NFC card (including activate/deactivate)

#### `DELETE /api/nfc/cards/{id}`
Delete NFC card

### Events

#### `GET /api/nfc/events`
Get events
- **Query Params**: `?filter=active|upcoming`

#### `POST /api/nfc/events`
Create event
- **Body**: `{ name, date, location?, description? }`

### Check-ins

#### `GET /api/nfc/checkins`
Get check-ins
- **Query Params**: `?user_id={id}` or `?event_id={id}`

#### `POST /api/nfc/checkins`
Create check-in
- **Body**: `{ user_id, source, nfc_card_id?, event_id?, metadata? }`
- **Source**: `artist_profile | vip_pass | event_checkin | admin`

---

## Frontend Pages

### `/nfc/{card_uid}`
**NFC Routing Page**
- Validates card UID
- Shows loading state
- Redirects based on card type
- Logs check-in automatically
- Handles errors gracefully

### `/artist/{id}`
**Artist Profile Page**
- Full artist bio and portfolio
- Skills and expertise
- Social media links
- Press kit download
- Booking CTA
- Compatible with both NFC users and talent system

### `/vip/{id}`
**VIP Pass Page**
- VIP member information
- Membership tier display
- Benefits list
- Manual check-in button
- Event-specific check-in support
- Real-time check-in confirmation

### `/admin/nfc`
**Admin Dashboard**
- Tabbed interface:
  - Users management
  - NFC cards management
  - Events management
  - Check-ins log

---

## Admin Dashboard

### Accessing the Dashboard

Navigate to: `https://yourdomain.com/admin/nfc`

### Users Manager

**Features:**
- View all users with role badges
- Create new users (all roles)
- Edit user information
- Delete users
- Link users to existing talent profiles

**Creating a User:**
1. Click "Add User"
2. Fill in name, email, role
3. Optionally set password
4. Link to talent profile (for artists)
5. Click "Create User"

### NFC Cards Manager

**Features:**
- View all cards with status
- Assign cards to users
- Generate unique card UIDs
- Activate/deactivate cards
- Delete cards

**Creating an NFC Card:**
1. Click "Add NFC Card"
2. Card UID is auto-generated (or enter custom)
3. Select user to assign
4. Choose card type (artist/vip/staff)
5. Click "Create NFC Card"
6. Program physical NFC tag with the URL containing this UID

**Activating/Deactivating:**
- Click the power icon to toggle status
- Inactive cards will not work when tapped

### Events Manager

**Features:**
- Create events for check-in tracking
- View upcoming and past events
- Set event details (name, date, location)
- Mark events as active/inactive

**Creating an Event:**
1. Click "Add Event"
2. Enter event name
3. Set date and time
4. Add location and description
5. Click "Create Event"

### Check-ins Log

**Features:**
- View all check-ins in real-time
- Filter by user or source
- Search by name/email
- See timestamps and event associations
- Export data (future feature)

**Filtering:**
- Use search bar to find specific users
- Select source type to filter by check-in method
- View event-specific check-ins

---

## Getting Started

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   cd versatalent
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Neon database credentials
   ```

3. **Run database migrations:**
   - Copy `src/db/migrations/001_initial_schema.sql`
   - Execute in Neon SQL Editor

4. **Start development server:**
   ```bash
   bun run dev
   ```

5. **Access the application:**
   - Main site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin/nfc

### Production Deployment

1. **Set environment variables** in your hosting platform:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_SITE_URL`

2. **Build the application:**
   ```bash
   bun run build
   ```

3. **Deploy to your hosting platform**

---

## Common Workflows

### Workflow 1: Onboard a New Artist

1. **Create user account:**
   - Go to Admin → NFC → Users
   - Click "Add User"
   - Name: "John Doe"
   - Email: "john@example.com"
   - Role: "artist"
   - Talent ID: Link to existing talent profile (optional)
   - Save

2. **Create NFC card:**
   - Go to Admin → NFC → NFC Cards
   - Click "Add NFC Card"
   - Select user: "John Doe"
   - Type: "artist"
   - Note the generated card UID (e.g., `CARD-1234567890`)
   - Save

3. **Program physical NFC tag:**
   - Use NFC Tools app
   - Write URL: `https://versatalent.com/nfc/CARD-1234567890`
   - Give card to artist

4. **Test the card:**
   - Tap card with phone
   - Should redirect to artist profile
   - Check-in should be logged automatically

### Workflow 2: Set Up VIP Access for Event

1. **Create the event:**
   - Go to Admin → NFC → Events
   - Click "Add Event"
   - Name: "Summer Festival 2025"
   - Date: June 15, 2025
   - Location: "Leeds Arena"
   - Save

2. **Create VIP users:**
   - Go to Admin → NFC → Users
   - For each VIP guest:
     - Click "Add User"
     - Enter name and email
     - Role: "vip"
     - Save

3. **Assign NFC cards to VIPs:**
   - Go to Admin → NFC → NFC Cards
   - For each VIP:
     - Click "Add NFC Card"
     - Select VIP user
     - Type: "vip"
     - Program NFC card with generated UID
     - Give card to VIP

4. **VIPs check in at event:**
   - VIP taps card → opens VIP pass page
   - VIP clicks "Confirm Presence / Check-in"
   - If event parameter is in URL (e.g., `?event={event_id}`), check-in is associated with event

### Workflow 3: Track Artist Engagement

1. **Distribute artist NFC cards:**
   - Create NFC cards for all artists
   - Program with unique UIDs
   - Distribute to artists

2. **Artists share their cards:**
   - At events, meet-and-greets, etc.
   - Fans tap card → view artist profile
   - Each tap logs a check-in

3. **View analytics:**
   - Go to Admin → NFC → Check-ins
   - Filter by specific artist (user_id)
   - Filter by source: "artist_profile"
   - See all profile views and engagement

4. **Generate insights:**
   - Track which artists are most engaged
   - See geographic distribution (via IP addresses)
   - Identify peak engagement times

---

## Troubleshooting

### Card Not Working

**Problem**: Tapping NFC card shows "Invalid Card"

**Solutions**:
1. Verify card exists in database:
   ```sql
   SELECT * FROM nfc_cards WHERE card_uid = 'YOUR-CARD-UID';
   ```

2. Check if card is active:
   ```sql
   SELECT is_active FROM nfc_cards WHERE card_uid = 'YOUR-CARD-UID';
   ```

3. Verify URL on NFC tag matches database exactly

4. Check database connection in `.env.local`

### Check-ins Not Logging

**Problem**: NFC taps work but check-ins don't appear

**Solutions**:
1. Check browser console for errors

2. Verify check-in API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/nfc/checkins \
     -H "Content-Type: application/json" \
     -d '{"user_id":"USER-ID","source":"artist_profile"}'
   ```

3. Check database connection

4. Review check-ins table:
   ```sql
   SELECT * FROM checkins ORDER BY timestamp DESC LIMIT 10;
   ```

### Database Connection Issues

**Problem**: "DATABASE_URL not set" or connection errors

**Solutions**:
1. Verify `.env.local` file exists in project root

2. Check DATABASE_URL format:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```

3. Test connection in Neon dashboard

4. Restart development server after changing `.env.local`

### Admin Access Issues

**Problem**: Cannot access `/admin/nfc`

**Solutions**:
1. This system does not currently have authentication enforced
2. To add protection, implement NextAuth middleware
3. For now, restrict access via hosting platform (IP whitelist, etc.)

---

## Security Considerations

### Current Implementation
- API endpoints are currently unprotected
- Suitable for internal/controlled environments
- Database credentials must be kept secure

### Recommended for Production

1. **Implement authentication:**
   - Add NextAuth.js middleware
   - Protect all `/admin/*` routes
   - Require login for sensitive operations

2. **API security:**
   - Add rate limiting
   - Implement API keys for programmatic access
   - Add CORS restrictions

3. **Data protection:**
   - Encrypt sensitive user data
   - Implement audit logging
   - Regular database backups

4. **NFC card security:**
   - Use cryptographically secure random UIDs
   - Implement card expiration dates
   - Add tamper detection

---

## Future Enhancements

### Planned Features
- [ ] Analytics dashboard with charts
- [ ] Export check-ins to CSV
- [ ] Email notifications for check-ins
- [ ] QR code alternatives to NFC
- [ ] Mobile app for card management
- [ ] Geo-location tracking (optional)
- [ ] Integration with CRM systems
- [ ] Automated reporting

### Community Contributions
Contributions are welcome! Please follow the existing code structure and submit pull requests.

---

## Support

For questions or issues:
- **Email**: support@versatalent.com
- **GitHub Issues**: [Create an issue](https://github.com/versatalent-tech/versatalent/issues)
- **Documentation**: https://docs.versatalent.com

---

## License

Copyright © 2025 VersaTalent. All rights reserved.

---

**Last Updated**: November 2025
**Version**: 1.0.0
