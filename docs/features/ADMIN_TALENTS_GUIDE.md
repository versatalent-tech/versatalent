# Admin Talents Management Guide

## Quick Start

The **Talents Admin UI** allows you to manage all artist and talent profiles on VersaTalent. Access it at:

```
http://localhost:3000/admin/talents
```

Or in production:

```
https://your-domain.com/admin/talents
```

---

## Overview

The admin page provides full CRUD (Create, Read, Update, Delete) operations for managing talents, with special features for:

- ✨ **Featured Talents** - Control which talents appear on the homepage
- 👁️ **Active/Inactive** - Show or hide talents from public view (soft delete)
- 🎨 **Portfolio Management** - Add and manage portfolio items
- 🔗 **Social Links** - Connect talent profiles to social media

---

## Features

### 1. **View All Talents**

The main page displays all talents in a card grid with:
- Talent photo
- Name and profession
- Industry badge
- Location
- Featured status (⭐ badge)
- Active/inactive status (opacity and badge)
- Quick action buttons

### 2. **Search and Filter**

**Search Bar:**
- Search by name, profession, or location
- Real-time filtering as you type

**Industry Filter:**
- Filter by: Acting, Modeling, Music, Culinary, Sports
- Or view "All Industries"

**Show/Hide Inactive:**
- Toggle button to show or hide deactivated talents
- Inactive talents appear with reduced opacity and "Inactive" badge

---

## Managing Talents

### ➕ Create New Talent

1. Click **"Add New Talent"** button (top right)
2. Fill in the form:

#### Required Fields (marked with *)
- **Name** - Talent's full name
- **Profession** - e.g., "DJ", "Model", "Singer"
- **Bio** - Full biography (supports HTML)
- **Tagline** - Short catchphrase
- **Profile Image** - Main photo URL

#### Basic Information
- **Industry** - Select from: Acting, Modeling, Music, Culinary, Sports
- **Gender** - Male, Female, Non-binary
- **Age Group** - Child, Teen, Young Adult, Adult, Senior
- **Location** - City and country

#### Additional Details
- **Skills** - Comma-separated list (e.g., "Runway, Photoshoot, Commercial")
- **Social Links** - Instagram, Twitter, YouTube, Website

#### Portfolio
- Add portfolio items (images/videos)
- Each item can have: title, description, category, photographer, etc.

#### Settings
- ☑️ **Featured** - Show on homepage
- ☑️ **Active** - Visible on public site

3. Click **"Create Talent"**

**Success:** Green notification appears, talent added to list

---

### ✏️ Edit Existing Talent

1. Find the talent in the list
2. Click the **"Edit"** button
3. Modify any fields in the form
4. Click **"Update Talent"**

**Note:** All fields can be updated except the ID

---

### 🗑️ Delete Talent

1. Find the talent in the list
2. Click the **"Delete"** button (red trash icon)
3. Confirm deletion in the dialog
4. Click **"Delete"** to confirm

**Warning:** This is a **permanent** deletion. The talent and all associated data will be removed from the database.

**Alternative:** Use "Deactivate" instead for soft delete (talent hidden but data preserved)

---

### ⭐ Toggle Featured Status

**Purpose:** Control which talents appear on the homepage

**To Feature a Talent:**
1. Find the talent in the list
2. Click the **"Feature"** button (⭐ Star icon)
3. Talent is immediately marked as featured
4. Talent will now appear on the homepage

**To Unfeature a Talent:**
1. Find the featured talent (has yellow ⭐ badge)
2. Click the **"Unfeature"** button
3. Talent is removed from featured status
4. Talent will no longer appear on homepage

**Featured Badge:** Yellow star (⭐) appears on talent cards

**Homepage Display:**
- Only **active AND featured** talents show on homepage
- Limited to 4 talents maximum
- Sorted by newest first

---

### 👁️ Toggle Active/Inactive Status

**Purpose:** Hide talents from public view without deleting them (soft delete)

**To Deactivate a Talent:**
1. Find the active talent in the list
2. Click the **"Deactivate"** button (👁️‍🗨️ Eye icon)
3. Talent is immediately hidden from public

**To Activate a Talent:**
1. Click **"Show All"** to view inactive talents
2. Find the inactive talent (grayed out with "Inactive" badge)
3. Click the **"Activate"** button (👁️ Eye icon)
4. Talent is immediately visible on public site

**Inactive Indicators:**
- Gray "Inactive" badge
- 60% opacity on card
- Only visible in admin view

**Public Impact:**
- **Inactive talents:**
  - NOT shown on `/talents` page
  - NOT shown on homepage (even if featured)
  - NOT accessible on `/talents/[id]` pages
  - API returns 404 for inactive talents

- **Active talents:**
  - Shown on `/talents` page
  - Shown on homepage if also featured
  - Accessible on individual pages

---

## Status Combinations

| Featured | Active | Homepage | Talents Page | Individual Page |
|----------|--------|----------|--------------|-----------------|
| ✅ Yes   | ✅ Yes | ✅ Shows | ✅ Shows     | ✅ Shows        |
| ✅ Yes   | ❌ No  | ❌ Hidden| ❌ Hidden    | ❌ Hidden       |
| ❌ No    | ✅ Yes | ❌ Hidden| ✅ Shows     | ✅ Shows        |
| ❌ No    | ❌ No  | ❌ Hidden| ❌ Hidden    | ❌ Hidden       |

---

## Portfolio Management

Each talent can have multiple portfolio items:

### Adding Portfolio Items

1. In create/edit form, scroll to **"Portfolio"** section
2. Click **"Add Portfolio Item"**
3. Fill in details:
   - **Title** - Project name
   - **Description** - Project details
   - **Type** - Image or Video
   - **URL** - Link to media
   - **Category** - e.g., "Performance", "Editorial", "Campaign"
   - **Thumbnail** (optional) - For videos
   - **Photographer** (optional)
   - **Location** (optional)
   - **Client** (optional)
   - **Year** (optional)

4. Click **"Save"** or **"Add"**

### Editing Portfolio Items

1. Click **"Edit"** on the portfolio item
2. Modify fields
3. Click **"Save Changes"**

### Deleting Portfolio Items

1. Click **"Delete"** on the portfolio item
2. Confirm deletion

**Note:** Portfolio changes are saved when you save the talent profile

---

## Social Links

Connect talent profiles to social media:

**Supported Platforms:**
- 📷 Instagram
- 🐦 Twitter
- 📺 YouTube
- 🌐 Website

**To Add/Edit Social Links:**

1. In create/edit form, scroll to **"Social Links"** section
2. Enter full URLs for each platform:
   ```
   Instagram: https://instagram.com/username
   Twitter: https://twitter.com/username
   YouTube: https://youtube.com/@username
   Website: https://yourwebsite.com
   ```

3. Leave blank if not applicable
4. Save the talent profile

**Display:**
- Social links appear on talent detail pages
- Clickable icons linking to platforms

---

## Image Upload

**Profile Image:**
- Main photo for the talent
- Required field
- Shows on homepage, listings, and detail page

**How to Upload:**

1. In the **"Profile Image"** section
2. Enter the image URL in the input field
   ```
   /deejaywg/IMG_8999.jpg
   ```
   Or use external URL:
   ```
   https://images.unsplash.com/photo-...
   ```

3. Image preview should appear

**Recommendations:**
- Use high-quality images (min 800x1000px)
- Aspect ratio: 3:4 (portrait) works best
- Supported formats: JPG, PNG, WebP
- Store images in `/public/` directory for local files

---

## Best Practices

### ✅ Do's

- ✅ Use descriptive, professional bios
- ✅ Upload high-quality images
- ✅ Keep skills list focused (3-5 main skills)
- ✅ Use "Deactivate" instead of "Delete" when possible
- ✅ Feature only your best 4 talents on homepage
- ✅ Keep portfolio updated with latest work
- ✅ Verify all social links work before saving

### ❌ Don'ts

- ❌ Don't use low-resolution images
- ❌ Don't leave required fields blank
- ❌ Don't feature too many talents (homepage shows only 4)
- ❌ Don't delete talents unless absolutely necessary
- ❌ Don't use incomplete or placeholder text in production
- ❌ Don't forget to test links after adding

---

## Workflow Examples

### Example 1: Adding a New Model

1. Click "Add New Talent"
2. Fill in:
   - Name: "Sarah Johnson"
   - Industry: "Modeling"
   - Gender: "Female"
   - Age Group: "Young Adult"
   - Profession: "Fashion Model"
   - Location: "London, UK"
   - Bio: "Professional runway and editorial model..."
   - Tagline: "Elegance in motion"
   - Skills: "Runway, Editorial, Commercial, Fitness"
   - Image: "/models/sarah-johnson.jpg"
   - Instagram: "https://instagram.com/sarahjmodel"
   - Featured: ☑️ (to show on homepage)
   - Active: ☑️
3. Add 3-4 portfolio items
4. Click "Create Talent"

### Example 2: Temporarily Hiding a Talent

**Scenario:** Talent is on extended leave

1. Find talent in list
2. Click "Deactivate" button
3. Talent is hidden from public
4. When they return, click "Show All"
5. Find their profile
6. Click "Activate"

### Example 3: Updating Homepage Featured Talents

**Scenario:** Rotate featured talents monthly

1. Find currently featured talent
2. Click "Unfeature" to remove from homepage
3. Find new talent to feature
4. Click "Feature" to add to homepage
5. Verify on homepage that changes took effect

---

## Troubleshooting

### Talent Not Showing on Homepage

**Possible causes:**
- ❌ Not marked as "Featured"
- ❌ Not marked as "Active"
- ❌ More than 4 talents are featured (only first 4 show)

**Solution:**
1. Check featured status (⭐ badge)
2. Check active status (not grayed out)
3. Reduce featured talents to 4 or fewer

### Talent Not Showing on Talents Page

**Possible causes:**
- ❌ Marked as "Inactive"

**Solution:**
1. Click "Show All" in admin
2. Find the talent (should be grayed out)
3. Click "Activate"

### Image Not Displaying

**Possible causes:**
- ❌ Incorrect image URL
- ❌ Image file doesn't exist
- ❌ Wrong file path

**Solution:**
1. Verify image URL is correct
2. Check image exists in `/public/` directory
3. Try using full URL (https://...)

### Can't Delete Talent

**Possible causes:**
- ❌ Network error
- ❌ Permission issue

**Solution:**
1. Check browser console for errors
2. Try refreshing page
3. Try "Deactivate" instead

---

## API Integration

The admin UI uses these API endpoints:

```bash
# Get all talents (including inactive for admin)
GET /api/talents?activeOnly=false

# Get single talent
GET /api/talents/{id}

# Create talent
POST /api/talents

# Update talent
PUT /api/talents/{id}

# Delete talent
DELETE /api/talents/{id}
```

**Headers Required:**
```
Content-Type: application/json
```

---

## Database Fields Reference

| Field Name    | Type    | Required | Description                      |
|---------------|---------|----------|----------------------------------|
| name          | text    | Yes      | Talent's full name               |
| industry      | text    | Yes      | Industry category                |
| gender        | text    | Yes      | Gender                           |
| age_group     | text    | Yes      | Age category                     |
| profession    | text    | Yes      | Job title/role                   |
| location      | text    | Yes      | City and country                 |
| bio           | text    | Yes      | Full biography                   |
| tagline       | text    | Yes      | Short catchphrase                |
| skills        | array   | Yes      | List of skills                   |
| image_src     | text    | Yes      | Profile image URL                |
| featured      | boolean | No       | Show on homepage (default: false)|
| is_active     | boolean | No       | Visible on site (default: true)  |
| social_links  | json    | No       | Social media URLs                |
| portfolio     | json    | No       | Portfolio items array            |

---

## Security Notes

⚠️ **Important:**

- The admin UI currently does NOT have authentication
- Anyone can access `/admin/talents` and make changes
- **DO NOT** deploy to production without adding authentication
- Consider implementing role-based access control (RBAC)

**Recommended:** Add authentication before production deployment

---

## Support

For technical issues:

1. Check the browser console for errors
2. Review `TALENTS_SYSTEM_README.md` for system documentation
3. Check the database migration status
4. Verify environment variables are set

---

**Last Updated:** December 3, 2025
**Version:** 150
**Admin Path:** `/admin/talents`
