# VersaTalent Talents System

## Overview

The **Talents System** manages all artist/talent profiles in VersaTalent. This document explains how the system works after migration from static files to **Neon PostgreSQL** database.

---

## Architecture

### Database Table: `talents`

Located in migration: `src/db/migrations/006_talents_system.sql`

#### Schema

```sql
CREATE TABLE talents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  industry        text NOT NULL,              -- 'acting' | 'modeling' | 'music' | 'culinary' | 'sports'
  gender          text NOT NULL,              -- 'male' | 'female' | 'non-binary'
  age_group       text NOT NULL,              -- 'child' | 'teen' | 'young-adult' | 'adult' | 'senior'
  profession      text NOT NULL,
  location        text NOT NULL,
  bio             text NOT NULL,
  tagline         text NOT NULL,
  skills          text[] NOT NULL DEFAULT '{}',
  image_src       text NOT NULL,
  featured        boolean DEFAULT false,      -- Show on homepage
  is_active       boolean DEFAULT true,       -- Soft delete flag
  social_links    jsonb DEFAULT '{}'::jsonb,  -- Instagram, TikTok, YouTube, etc.
  portfolio       jsonb DEFAULT '[]'::jsonb,  -- Array of portfolio items
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp DEFAULT now()
);
```

#### Indexes

- `idx_talents_industry` - Fast filtering by industry
- `idx_talents_featured` - Fast homepage queries
- `idx_talents_active` - Filter active talents
- `idx_talents_industry_active` - Combined index for common queries

---

## Key Features

### 1. **Featured Talents on Homepage**

- Talents with `featured = true` appear on the homepage
- Limited to 4 talents in grid layout
- Sorted by `created_at DESC` (newest first)
- Only active talents are shown

### 2. **Portfolio Management**

Each talent can have multiple portfolio items stored as JSONB:

```typescript
interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  url: string;
  date?: string;
  category?: string;
  photographer?: string;
  location?: string;
  client?: string;
  year?: number;
  featured?: boolean;
  professional?: boolean;
  tags?: string[];
}
```

### 3. **Social Media Integration**

Social links stored as JSONB:

```typescript
interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}
```

### 4. **Industry Categories**

- **Acting** - Actors, performers
- **Modeling** - Fashion models, commercial models
- **Music** - DJs, singers, musicians, producers
- **Culinary** - Chefs, food artists
- **Sports** - Athletes, footballers, etc.

---

## API Endpoints

### **GET /api/talents**

Fetch all active talents with optional filters.

**Query Parameters:**

- `industry` - Filter by industry (e.g., `?industry=music`)
- `featured` - Show only featured talents (`?featured=true`)
- `q` - Search by name, tagline, or skills (`?q=DJ`)

**Example Requests:**

```bash
# All active talents
GET /api/talents

# Featured talents (homepage)
GET /api/talents?featured=true

# Music talents only
GET /api/talents?industry=music

# Search talents
GET /api/talents?q=DJ
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Deejay WG",
    "industry": "music",
    "gender": "male",
    "age_group": "adult",
    "profession": "Deejay",
    "location": "Leeds, UK",
    "bio": "With contagious energy...",
    "tagline": "The right vibe, at the right time.",
    "skills": ["Amapiano", "Afrohouse", "Kizomba"],
    "image_src": "/deejaywg/IMG_8999.jpg",
    "featured": true,
    "is_active": true,
    "social_links": {
      "instagram": "https://instagram.com/deejaywg_",
      "tiktok": "https://tiktok.com/@deejaywg_"
    },
    "portfolio": [...],
    "created_at": "2025-12-03T10:00:00Z",
    "updated_at": "2025-12-03T10:00:00Z"
  }
]
```

---

### **GET /api/talents/[id]**

Fetch a single talent by ID.

**Example:**

```bash
GET /api/talents/abc123-def456
```

**Response:** Same as above (single talent object)

---

### **POST /api/talents** (Admin Only)

Create a new talent.

**Request Body:**

```json
{
  "name": "New Talent",
  "industry": "modeling",
  "gender": "female",
  "age_group": "young-adult",
  "profession": "Fashion Model",
  "location": "London, UK",
  "bio": "Experienced fashion model...",
  "tagline": "Elegance in motion",
  "skills": ["Runway", "Editorial", "Commercial"],
  "image_src": "/images/talent.jpg",
  "featured": false,
  "social_links": {
    "instagram": "https://instagram.com/newtalent"
  },
  "portfolio": []
}
```

**Response:** Created talent object (201)

---

### **PUT /api/talents/[id]** (Admin Only)

Update an existing talent.

**Request Body:** (partial update supported)

```json
{
  "featured": true,
  "bio": "Updated bio text..."
}
```

**Response:** Updated talent object

---

### **DELETE /api/talents/[id]** (Admin Only)

Permanently delete a talent.

**Response:**

```json
{
  "success": true,
  "message": "Talent deleted successfully"
}
```

---

## Frontend Components

### 1. **Homepage - Featured Talents**

**Component:** `src/components/home/FeaturedTalents.tsx`

- Fetches talents with `?featured=true`
- Displays up to 4 talents in grid
- Shows loading state
- Hides section if no featured talents

**Usage:**

```tsx
import { FeaturedTalents } from '@/components/home/FeaturedTalents';

<FeaturedTalents />
```

### 2. **Talents Listing Page**

**Page:** `src/app/talents/page.tsx`

- Lists all active talents
- Filters by industry
- Search functionality
- Already uses API (no changes needed)

### 3. **Talent Detail Page**

**Page:** `src/app/talents/[id]/page.tsx`

- Shows full talent profile
- Portfolio section
- Social media links
- Already uses API (no changes needed)

---

## Database Repository

**File:** `src/lib/db/repositories/talents.ts`

### Available Functions:

```typescript
// Get all talents with filters
getAllTalents(options?: {
  industry?: Industry;
  featured?: boolean;
  activeOnly?: boolean;
}): Promise<Talent[]>

// Get featured talents (homepage)
getFeaturedTalents(): Promise<Talent[]>

// Get talents by industry
getTalentsByIndustry(industry: Industry): Promise<Talent[]>

// Get single talent
getTalentById(id: string): Promise<Talent | null>

// Search talents
searchTalents(searchTerm: string): Promise<Talent[]>

// Create new talent
createTalent(data: CreateTalentRequest): Promise<Talent>

// Update talent
updateTalent(id: string, data: UpdateTalentRequest): Promise<Talent | null>

// Soft delete (set is_active = false)
deactivateTalent(id: string): Promise<boolean>

// Hard delete (permanent)
deleteTalent(id: string): Promise<boolean>

// Toggle featured status
toggleFeatured(id: string): Promise<Talent | null>
```

---

## Migration Guide

### Running the Migration

**Option 1: Neon Console**

1. Log into [Neon Console](https://console.neon.tech)
2. Select your VersaTalent database
3. Navigate to **SQL Editor**
4. Copy and paste the contents of:
   ```
   src/db/migrations/006_talents_system.sql
   ```
5. Execute the migration
6. Verify the `talents` table is created

**Option 2: Using SQL Client**

```bash
psql $DATABASE_URL -f src/db/migrations/006_talents_system.sql
```

### Seed Data

The migration automatically inserts 4 existing talents:

1. **Deejay WG** (Music - DJ)
2. **Jessica Dias** (Modeling)
3. **João Rodolfo** (Music - Singer)
4. **Antonio Monteiro** (Sports - Footballer)

All are set to `featured = true` and `is_active = true`.

---

## Admin Workflows

### Mark a Talent as Featured

```bash
# Using repository
import { toggleFeatured } from '@/lib/db/repositories/talents';
await toggleFeatured(talentId);

# Or via API
PUT /api/talents/{id}
{ "featured": true }
```

### Deactivate a Talent (Soft Delete)

```bash
import { deactivateTalent } from '@/lib/db/repositories/talents';
await deactivateTalent(talentId);
```

### Add Portfolio Item

```bash
PUT /api/talents/{id}
{
  "portfolio": [
    ...existingItems,
    {
      "id": "new-item",
      "title": "New Project",
      "description": "Description",
      "type": "image",
      "url": "/images/project.jpg",
      "category": "Commercial",
      "year": 2025
    }
  ]
}
```

---

## TypeScript Types

**File:** `src/lib/db/types.ts`

```typescript
export type Industry = 'acting' | 'modeling' | 'music' | 'culinary' | 'sports';
export type Gender = 'male' | 'female' | 'non-binary';
export type AgeGroup = 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';

export interface Talent {
  id: string;
  name: string;
  industry: Industry;
  gender: Gender;
  age_group: AgeGroup;
  profession: string;
  location: string;
  bio: string;
  tagline: string;
  skills: string[];
  image_src: string;
  featured: boolean;
  is_active: boolean;
  social_links?: SocialLinks;
  portfolio?: PortfolioItem[];
  created_at: Date;
  updated_at: Date;
}
```

---

## Performance Considerations

### Caching

API responses include cache headers:

```
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
```

- Cached for 60 seconds
- Stale data served while revalidating for 30 seconds

### Indexes

All common query patterns are indexed:

- Featured talents (`WHERE featured = true`)
- Active talents (`WHERE is_active = true`)
- Industry filters (`WHERE industry = 'music'`)

### Image Optimization

- Use Next.js `<Image>` component for automatic optimization
- Images loaded with appropriate `priority` and `loading` attributes
- Responsive `sizes` attribute for optimal loading

---

## Backward Compatibility

The system maintains backward compatibility with old field names:

**Database → Frontend Mapping:**

- `image_src` → also exposed as `imageSrc`
- `age_group` → also exposed as `ageGroup`
- `social_links` → also exposed as `socialLinks`

This ensures existing components continue to work without changes.

---

## Testing

### Verify Migration

```sql
-- Check talents table exists
SELECT COUNT(*) FROM talents;

-- Verify featured talents
SELECT name, featured FROM talents WHERE featured = true;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'talents';
```

### Test API Endpoints

```bash
# All talents
curl http://localhost:3000/api/talents

# Featured talents
curl http://localhost:3000/api/talents?featured=true

# Single talent (use actual UUID)
curl http://localhost:3000/api/talents/{uuid}
```

---

## Future Enhancements

### Planned Features

- [ ] Admin UI for talent management
- [ ] Bulk upload talents
- [ ] Talent availability calendar
- [ ] Booking request system
- [ ] Statistics dashboard
- [ ] Multi-image portfolio support
- [ ] Video portfolio uploads

### Database Optimizations

- [ ] Add full-text search on bio and tagline
- [ ] Add JSONB indexes on portfolio
- [ ] Implement materialized views for analytics

---

## Troubleshooting

### No Talents Showing on Homepage

1. Check if any talents have `featured = true`:
   ```sql
   SELECT name, featured, is_active FROM talents;
   ```
2. Verify API response:
   ```bash
   curl http://localhost:3000/api/talents?featured=true
   ```
3. Check browser console for errors

### Images Not Loading

- Verify `image_src` paths are correct
- Check Next.js `public/` directory contains images
- Ensure image paths start with `/`

### API Returns 500 Error

- Check database connection in `.env.local`
- Verify migration ran successfully
- Check server console for detailed error logs

---

## Support

For issues or questions:

- Check the main [VersaTalent README](./README.md)
- Review migration file: `src/db/migrations/006_talents_system.sql`
- Check database types: `src/lib/db/types.ts`
- Review repository: `src/lib/db/repositories/talents.ts`

---

**Last Updated:** December 3, 2025
**Migration Version:** 006
**Database:** Neon PostgreSQL
