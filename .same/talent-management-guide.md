# 🎭 Talent Management System - Complete Guide

## Overview

A comprehensive admin dashboard for managing your talent roster. Add, edit, and delete talents with complete profile information, images, and social links.

---

## 🚀 Getting Started

### Access the Admin Dashboard

1. Navigate to: **http://localhost:3000/admin/talents**
2. Or go to **http://localhost:3000/admin** and click "Talent Management"

---

## 📋 Features

### 1. **View All Talents**

The main dashboard displays all talents with:
- Profile image
- Name and profession
- Industry badge
- Tagline/bio snippet
- Location
- Skills (up to 3 visible)
- Featured badge (if applicable)
- Edit and Delete buttons

### 2. **Search & Filter**

- **Search Bar**: Find talents by name, profession, or location
- **Industry Filter**: Filter by:
  - All Industries
  - Acting
  - Modeling
  - Music
  - Culinary
  - Sports

### 3. **Add New Talent**

Click the **"Add New Talent"** button to open the creation form.

#### **Required Fields**
- **Name**: Full name of the talent
- **Profession**: What they do (e.g., "DJ & Producer")
- **Industry**: Select from dropdown (Acting/Modeling/Music/Culinary/Sports)
- **Gender**: Male/Female/Non-binary
- **Age Group**: Child/Teen/Young Adult/Adult/Senior
- **Location**: Where they're based (e.g., "Leeds, UK")
- **Tagline**: Short catchy description
- **Bio**: Detailed background and achievements

#### **Optional Fields**
- **Skills**: Comma-separated list (e.g., "DJing, Music Production, Live Performance")
- **Profile Image**: Upload directly or enter URL
- **Social Links**:
  - Instagram URL
  - Twitter URL
  - YouTube URL
  - Website URL
- **Featured**: Check to feature on homepage

### 4. **Edit Talent**

Click the **"Edit"** button on any talent card:
1. The edit dialog opens with all current values
2. Modify any fields you want to change
3. Upload new image if needed
4. Click **"Save Changes"** to update

### 5. **Delete Talent**

Click the **trash icon** button:
1. Confirmation dialog appears
2. Shows talent name and profession for verification
3. Click **"Delete Talent"** to confirm
4. Talent is permanently removed from the system

---

## 🎯 Detailed Form Guide

### **Basic Information**

#### Name *
- Full name of the talent
- Example: "William Graham" or "Jessica Dias"
- Used across the website

#### Profession *
- Their primary role/occupation
- Examples:
  - "DJ & Music Producer"
  - "International Model"
  - "Professional Footballer"
  - "Gumbé Musician"
- Displayed prominently on profile

#### Industry * (Dropdown)
- **Acting**: Actors, performers, theater artists
- **Modeling**: Fashion models, commercial models
- **Music**: Musicians, DJs, singers, producers
- **Culinary**: Chefs, food artists, culinary experts
- **Sports**: Athletes, sports professionals

#### Gender * (Dropdown)
- Male
- Female
- Non-binary

#### Age Group * (Dropdown)
- **Child**: Under 13
- **Teen**: 13-19
- **Young Adult**: 20-30
- **Adult**: 31-60
- **Senior**: 60+

---

### **Location & Description**

#### Location *
- Where the talent is based
- Format: "City, Country"
- Examples:
  - "Leeds, UK"
  - "London, UK"
  - "Manchester, UK"

#### Tagline *
- Short, catchy one-liner
- Displayed in listings and cards
- 50-100 characters recommended
- Examples:
  - "Rising DJ mixing Afrobeats and House"
  - "International runway model with 5+ years experience"
  - "Professional footballer with Championship experience"

#### Bio *
- Detailed background
- 200-500 words recommended
- Include:
  - Background and experience
  - Notable achievements
  - Unique selling points
  - Career highlights
  - Future goals

---

### **Skills**

- **Format**: Comma-separated list
- **Example**: `DJing, Music Production, Live Performance, Mixing`
- **Tip**: List 5-10 key skills
- **Used**: On talent profile, search, filtering

---

### **Profile Image**

Two ways to add images:

#### Option 1: Upload (Recommended)
1. Click **"Upload Image"** button
2. Select image from your computer
3. Preview appears automatically
4. Image saved to `/public/images/events/`

#### Option 2: Manual URL
1. Upload image to `/public/images/` directory
2. Enter path like `/images/talent-name.jpg`

**Requirements**:
- Format: JPEG, PNG, WebP, or GIF
- Max size: 5MB
- Recommended: 800x1000px (portrait)
- Professional headshot or action shot

---

### **Social Links**

All optional, but highly recommended:

#### Instagram
- Full URL: `https://instagram.com/username`
- Most important for talent visibility
- Used for social proof

#### Twitter
- Full URL: `https://twitter.com/username`
- Good for industry updates

#### YouTube
- Full URL: `https://youtube.com/@username`
- Essential for video content creators

#### Website
- Full URL: `https://example.com`
- Personal portfolio site

**Tip**: Leave blank if talent doesn't have that platform

---

### **Portfolio Management** 🆕

Add photos and videos showcasing the talent's work:

#### Adding Portfolio Items

1. **Click "Add Item"** in the Portfolio section
2. **Select Type**: Image or Video
3. **Fill in details**:
   - **Title**: Name of the work
   - **Description**: Brief description
   - **Image**: Upload directly or enter URL
   - **Video URL**: YouTube/Vimeo embed URL
   - **Category**: Commercial, Film, Print, Editorial, etc.
   - **Date**: Year or date of work
   - **Photographer**: Credit the photographer/videographer
   - **Location**: Where it was shot
   - **Client**: Client or project name
   - **Tags**: Keywords for organization
   - **Featured**: Check to highlight this item

#### Managing Portfolio Items

- **Edit**: Hover over item and click edit icon
- **Delete**: Hover over item and click trash icon
- **Reorder**: Drag and drop (coming soon)
- **Featured**: Mark best work to display prominently

#### Best Practices

- Add 10-20 high-quality items
- Mix of different work types
- Feature 3-5 best pieces
- Use professional photos
- Keep descriptions concise
- Credit photographers
- Update regularly with new work

---

### **Featured Talent**

- **Checkbox**: Check to feature this talent
- **Purpose**: Featured on homepage
- **Recommendation**: Limit to 3-5 featured talents
- **Use for**: Your top/most popular talents

---

## 💡 Best Practices

### **Profile Images**

1. **Quality**: Use high-resolution professional photos
2. **Lighting**: Well-lit, clear images
3. **Background**: Clean, professional backgrounds
4. **Crop**: Portrait orientation (3:4 ratio ideal)
5. **Size**: Compress to under 500KB
6. **Format**: JPEG for photos, PNG for graphics

### **Writing Bios**

1. **Start strong**: Lead with most impressive fact
2. **Be specific**: Numbers, achievements, credentials
3. **Show personality**: Let their uniqueness shine
4. **Keep updated**: Regular updates with new achievements
5. **Proofread**: Check grammar and spelling

### **Skills**

1. **Prioritize**: List most important skills first
2. **Be specific**: "Afrobeat DJ" vs just "DJ"
3. **Include variety**: Mix technical and soft skills
4. **Stay relevant**: Update as skills develop
5. **Limit**: 5-10 skills max for readability

### **Social Links**

1. **Verify**: Test all links before saving
2. **Active accounts**: Only link to active profiles
3. **Privacy**: Respect talent's privacy choices
4. **Professional**: Ensure accounts are professional
5. **Update**: Keep links current

---

## 🔧 Technical Details

### **API Routes**

#### GET `/api/talents`
- Fetches all talents
- Query params:
  - `industry`: Filter by industry
  - `featured`: Filter featured talents (`true`)
- Returns: Array of Talent objects

#### POST `/api/talents`
- Creates new talent
- Body: Talent object (without ID)
- Returns: Created talent with generated ID

#### GET `/api/talents/[id]`
- Fetches single talent by ID
- Returns: Talent object or 404

#### PUT `/api/talents/[id]`
- Updates existing talent
- Body: Complete Talent object
- Returns: Updated talent

#### DELETE `/api/talents/[id]`
- Deletes talent by ID
- Returns: Success message

---

### **Data Storage**

Talents stored in: `src/lib/data/talents-data.json`

Automatically created from static data on first run if it doesn't exist.

---

### **Talent Data Structure**

```typescript
{
  id: string;
  name: string;
  industry: 'acting' | 'modeling' | 'music' | 'culinary' | 'sports';
  gender: 'male' | 'female' | 'non-binary';
  ageGroup: 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';
  profession: string;
  location: string;
  bio: string;
  tagline: string;
  skills: string[];
  imageSrc: string;
  featured: boolean;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  portfolio?: PortfolioItem[]; // Future: Portfolio management
}
```

---

## 🐛 Troubleshooting

### **Talents Not Showing**

- Check filters are set to "All Industries"
- Clear search bar
- Refresh the page
- Check talents-data.json file exists

### **Image Not Loading**

- **For uploaded images**: Image should appear automatically
- **For manual paths**: Verify path starts with `/`
- Check image exists in `/public` directory
- Verify file permissions

### **Changes Not Appearing**

- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check API response in Network tab
- Verify talents-data.json was updated
- Restart dev server if needed

### **Creating Talent Fails**

- Fill all required fields (marked with *)
- Ensure name and industry are provided
- Check all URLs are valid if provided
- Verify image URL is correct

---

## 📊 Management Tips

### **Adding Multiple Talents**

1. Prepare all information in advance
2. Have images ready and optimized
3. Use consistent naming conventions
4. Fill out complete profiles (don't skip optional fields)
5. Test each talent on public page after adding

### **Keeping Profiles Updated**

1. **Regular reviews**: Check profiles quarterly
2. **New achievements**: Add recent accomplishments to bio
3. **New skills**: Update skills as talents develop
4. **New content**: Update images periodically
5. **Social links**: Verify links still work

### **Featured Talents Strategy**

1. **Rotate regularly**: Change featured talents monthly
2. **Balance industries**: Feature talents from different industries
3. **Performance based**: Feature top performers
4. **New talent**: Feature newcomers to boost visibility
5. **Upcoming events**: Feature talents with upcoming shows

---

## 🎨 Industry Guidelines

### **Acting**
- **Profession**: "Actor", "Theater Artist", "Voice Actor"
- **Skills**: "Stage Acting", "Film", "Voice Over", "Improv"
- **Bio focus**: Training, roles, theater/film experience
- **Image**: Professional headshot

### **Modeling**
- **Profession**: "Fashion Model", "Commercial Model", "Runway Model"
- **Skills**: "Runway", "Editorial", "Commercial", "Fitness"
- **Bio focus**: Height, measurements, notable campaigns
- **Image**: Professional portfolio shot

### **Music**
- **Profession**: "DJ", "Musician", "Singer", "Producer"
- **Skills**: Genre specialties, instruments, software
- **Bio focus**: Musical style, influences, performances
- **Image**: Performance shot or professional photo

### **Culinary**
- **Profession**: "Chef", "Pastry Chef", "Food Artist"
- **Skills**: Cuisines, techniques, specialties
- **Bio focus**: Training, restaurants, specializations
- **Image**: Professional chef photo

### **Sports**
- **Profession**: "Professional Footballer", "Athlete"
- **Skills**: Position, strengths, achievements
- **Bio focus**: Career stats, teams, achievements
- **Image**: Action shot or professional photo

---

## ✅ Quick Start Checklist

- [ ] Navigate to `/admin/talents`
- [ ] Click "Add New Talent"
- [ ] Fill in name and profession
- [ ] Select industry, gender, and age group
- [ ] Add location
- [ ] Write compelling tagline
- [ ] Write detailed bio (200+ words)
- [ ] Add 5-10 key skills
- [ ] Upload profile image
- [ ] Add social media links
- [ ] Check "Featured" if appropriate
- [ ] Click "Add Talent"
- [ ] View talent on `/talents` page
- [ ] Verify all information displays correctly

---

## 🎉 You're Ready!

Your talent management system is fully operational. Add your entire roster and showcase your exceptional talents to the world!

**Happy Talent Managing! 🌟**
