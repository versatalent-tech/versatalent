# VersaTalent Platform

**A comprehensive talent management and event platform with NFC membership, VIP loyalty, and integrated POS system.**

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/versatalent-tech/versatalent.git
cd versatalent

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run migrations (see Database Setup below)

# Start development server
bun run dev
```

Visit `http://localhost:3000`

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Setup](#-database-setup)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)

---

## 🏗️ Architecture Overview

VersaTalent is built as a **Next.js 15 full-stack application** with the following architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Next.js 15 App Router • TypeScript • Tailwind CSS      │
│  shadcn/ui Components • Framer Motion                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 API Routes (Backend)                     │
│  RESTful API • Server Actions • Middleware              │
│  Authentication • Authorization • Validation            │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴──────────┐
                │                      │
                ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐
│  Neon PostgreSQL     │   │  SumUp Payments API  │
│  (Serverless)        │   │  POS • Webhooks      │
└──────────────────────┘   └──────────────────────┘
```

### Core Systems

1. **NFC Membership System** - Track user check-ins and engagement via NFC cards
2. **VIP Loyalty Program** - Three-tier system (Silver/Gold/Black) with points and benefits
3. **Point of Sale (POS)** - Complete retail system with SumUp card payments
4. **Talent Management** - Comprehensive profiles, portfolios, and social media
5. **Events System** - Event creation, management, and ticket integration
6. **Admin Dashboard** - Full control panel for staff and administrators
7. **Analytics** - Real-time tracking of sales, check-ins, and engagement

---

## ✨ Features

### For Administrators
- ✅ **Talent Management** - Create, edit, and manage talent profiles
- ✅ **Event Management** - Schedule and manage events with NFC check-ins
- ✅ **User Management** - Control user accounts, roles, and permissions
- ✅ **VIP System** - Manage tiers, benefits, and point rules
- ✅ **Purchase History** - View complete customer purchase records
- ✅ **NFC Card Management** - Register and assign NFC cards to users
- ✅ **Analytics Dashboard** - Real-time metrics and reporting

### For Staff
- ✅ **POS System** - Process sales with a SumUp card reader, the SumUp app (Tap to Pay) or cash
- ✅ **NFC Reader** - Attach customer cards to orders for loyalty points
- ✅ **Product Management** - Update inventory and pricing
- ✅ **Order History** - View past transactions

### For Customers
- ✅ **Talent Discovery** - Browse talented artists, models, musicians, chefs, athletes
- ✅ **Event Calendar** - View upcoming performances and events
- ✅ **NFC Check-ins** - Tap card at events for loyalty points
- ✅ **VIP Dashboard** - Track points, tier status, and benefits
- ✅ **Purchase History** - View all past orders

### Technical Features
- ✅ **Google Drive Integration** - Direct image hosting support
- ✅ **Image Optimization** - Client-side compression before upload
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Real-time Updates** - Live analytics and metrics
- ✅ **Security** - Role-based access control, auth guards

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Image Lightbox**: yet-another-react-lightbox

### Backend
- **Runtime**: Bun (Node.js alternative)
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: SQL queries via @neondatabase/serverless
- **Authentication**: Custom JWT-based auth
- **Payments**: SumUp (Solo card readers via the Cloud API, SumUp app transactions)
- **Password Hashing**: bcryptjs

### Development
- **Linting**: Biome
- **Package Manager**: Bun
- **Version Control**: Git
- **Deployment**: Netlify (Frontend + API)

---

## 📁 Project Structure

```
versatalent/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/           # Public pages (home, talents, events)
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── staff/              # Staff POS pages
│   │   ├── api/                # API route handlers
│   │   │   ├── admin/          # Admin-only endpoints
│   │   │   ├── events/         # Events API
│   │   │   ├── nfc/            # NFC card operations
│   │   │   ├── pos/            # Point of sale API
│   │   │   ├── staff/          # Staff authentication
│   │   │   ├── talents/        # Talent management
│   │   │   ├── vip/            # VIP loyalty system
│   │   │   └── webhooks/       # SumUp webhook
│   │   └── ...
│   ├── components/             # React components
│   │   ├── admin/              # Admin-specific components
│   │   ├── auth/               # Authentication guards
│   │   ├── dashboard/          # Analytics dashboards
│   │   ├── home/               # Landing page sections
│   │   ├── layout/             # Header, footer, navigation
│   │   ├── pos/                # POS system components
│   │   ├── talents/            # Talent profile components
│   │   └── ui/                 # Reusable UI components (shadcn)
│   ├── lib/                    # Shared utilities and services
│   │   ├── auth/               # Authentication utilities
│   │   ├── db/                 # Database client and types
│   │   │   └── repositories/   # Data access layer
│   │   ├── services/           # Business logic services
│   │   ├── hooks/              # React custom hooks
│   │   └── utils/              # Helper functions
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
│   ├── images/                 # Uploaded images
│   └── ...
├── scripts/                    # Utility scripts
│   └── optimize-*.js           # Image optimization scripts
├── migrations/                 # Database migrations
│   └── 001-012_*.sql           # Migration files
├── docs/                       # Documentation (planned)
│   ├── setup/                  # Installation guides
│   ├── features/               # Feature documentation
│   ├── api/                    # API reference
│   ├── deployment/             # Deployment guides
│   └── testing/                # Testing guides
├── .env.local                  # Environment variables (not in git)
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

### Key Directories Explained

- **`src/app/api/`** - All backend API routes following Next.js file-based routing
- **`src/lib/db/repositories/`** - Database access layer, one file per entity
- **`src/lib/services/`** - Business logic (VIP points, SumUp payments, analytics)
- **`src/components/admin/`** - Admin dashboard UI components
- **`src/components/ui/`** - Reusable shadcn/ui components

---

## 🗄️ Database Setup

VersaTalent uses **Neon PostgreSQL** (serverless) as its database.

### Running Migrations

Migrations are located in `src/db/migrations/` and `migrations/`.

```sql
-- In Neon Console SQL Editor, run migrations in order:
001_initial_schema.sql          -- Core tables (users, roles)
002_vip_points_system.sql       -- VIP loyalty tables
003_vip_tier_benefits.sql       -- Tier benefits
004_events_system.sql           -- Events and venues
005_integrate_events_systems.sql -- Event-user links
006_talents_system.sql          -- Talent profiles
007_link_users_to_talents.sql   -- User-talent relationship
008_pos_system.sql              -- POS orders and products
011_inventory_management.sql    -- Inventory tracking
012_stripe_customer_integration.sql -- Stripe customer IDs (no longer used)
```

### Database Schema Overview

**Core Tables:**
- `users` - User accounts (customers, talents, staff, admins)
- `roles` - Role definitions (admin, staff, artist, vip)
- `user_roles` - User-role assignments

**NFC System:**
- `nfc_cards` - Physical NFC cards
- `nfc_events` - Check-in enabled events
- `nfc_checkins` - Check-in records

**VIP System:**
- `vip_memberships` - User membership status
- `vip_point_rules` - Point earning rules
- `vip_points_log` - Point transaction history
- `vip_tier_benefits` - Benefits per tier
- `vip_consumptions` - Redeemed benefits

**POS System:**
- `products` - Product catalog
- `product_inventory` - Stock tracking
- `pos_orders` - Customer orders
- `pos_order_items` - Order line items

**Content:**
- `talents` - Talent profiles
- `events` - Event records

---

## 🔑 Environment Variables

Create a `.env.local` file in the root:

```bash
# Database
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/db?sslmode=require"

# SumUp card payments (see docs/setup/SUMUP_SETUP_GUIDE.md)
SUMUP_API_KEY="sup_sk_..."
SUMUP_MERCHANT_CODE="MC0X0ABC"
SUMUP_AFFILIATE_KEY="..."
SUMUP_AFFILIATE_APP_ID="..."

# Admin Authentication
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-password"  # Change this!

# Staff Authentication
STAFF_USERNAME="staff"
STAFF_PASSWORD="your-secure-password"  # Change this!

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or production URL

# Optional: Instagram (if using social feed)
INSTAGRAM_ACCESS_TOKEN="..."
INSTAGRAM_USER_ID="..."
```

**Security Notes:**
- Never commit `.env.local` to version control
- Use strong passwords for admin/staff accounts
- Rotate the SumUp API key regularly

---

## 💻 Development

### Start Development Server

```bash
bun run dev
```

Server starts at `http://localhost:3000`

### Available Scripts

```bash
bun run dev          # Start dev server with Turbopack
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run linter
```

### Development Workflow

1. **Create a branch** for your feature
2. **Make changes** following the existing code style
3. **Test thoroughly** - check all affected flows
4. **Run linter** - `bun run lint`
5. **Commit** with descriptive messages
6. **Push** and create a pull request

### Code Style

- Use **TypeScript** for type safety
- Follow **functional programming** where possible
- Use **async/await** over promises
- **Extract** complex logic into separate functions
- **Comment** complex sections
- Use **meaningful variable names**

---

## 🚀 Deployment

### Netlify Deployment

1. **Connect repository** to Netlify
2. **Set build command**: `bun run build`
3. **Set publish directory**: `.next`
4. **Add environment variables** from `.env.local`
5. **Deploy!**

### Database Migration in Production

Run migrations in Neon Console before deploying new versions.

### SumUp Card Payments

1. Add the four `SUMUP_*` variables in Netlify and redeploy
2. Open Admin → Card Payments (SumUp) to check the connection and pair Solo readers
3. SumUp reports reader payments to `https://yourdomain.com/api/webhooks/sumup` automatically (no dashboard setup needed)

See `docs/setup/SUMUP_SETUP_GUIDE.md`.

---

## 📚 API Documentation

### Authentication

**Admin Auth**
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/check` - Verify admin session

**Staff Auth**
- `POST /api/staff/login` - Staff login
- `POST /api/staff/logout` - Staff logout
- `GET /api/staff/auth/check` - Verify staff session

### NFC System

- `GET /api/nfc/cards` - List all NFC cards
- `POST /api/nfc/cards` - Register new card
- `GET /api/nfc/[card_uid]` - Get user by card UID
- `POST /api/nfc/checkins` - Record check-in

### VIP System

- `GET /api/vip/memberships/[user_id]` - Get user VIP status
- `POST /api/vip/points/adjust` - Award/deduct points
- `GET /api/vip/points-log` - View point history
- `GET /api/vip/point-rules` - Get earning rules

### POS System

- `GET /api/pos/products` - List products
- `POST /api/pos/products` - Create product
- `POST /api/pos/orders` - Create order
- `POST /api/pos/sumup/checkout` - Send the order total to a SumUp Solo reader
- `POST /api/pos/sumup/confirm` - Complete an order paid in the SumUp app
- `POST /api/staff/pos/nfc-attach` - Attach NFC card to order

### Talents & Events

- `GET /api/talents` - List talents
- `POST /api/talents` - Create talent (admin only)
- `GET /api/events` - List events
- `POST /api/events` - Create event (admin only)

*See `/docs/api` for complete API reference (coming soon)*

---

## 🧪 Testing

### Manual Testing Checklist

**Critical Flows:**
- [ ] NFC card attaches to POS order
- [ ] VIP points are awarded after purchase
- [ ] Admin can create talents and events
- [ ] Staff can process POS sales
- [ ] SumUp reader payments complete the order

### Running Tests

```bash
# Currently using manual testing
# Automated tests coming soon
```

### Test User Accounts

After seeding (manually create in admin):
- **Admin**: Username from `.env.local`
- **Staff**: Username from `.env.local`
- **Test Customer**: Create via POS or admin panel

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Maintain backward compatibility
- Add tests for new features
- Update documentation
- Follow existing code style
- Keep PRs focused and small

---

## 📞 Support

- **Issues**: https://github.com/versatalent-tech/versatalent/issues
- **Discussions**: https://github.com/versatalent-tech/versatalent/discussions

---

## 📄 License

Proprietary - All rights reserved by VersaTalent

---

## 🎯 Roadmap

### Current Version: 1.82
- ✅ Core NFC, VIP, POS, Events, Talents systems
- ✅ SumUp card payments (Solo readers, SumUp app, cash)
- ✅ Google Drive image support
- ✅ Admin & staff dashboards

### Upcoming Features
- [ ] Email notifications (password resets, receipts)
- [ ] Two-factor authentication
- [ ] Advanced analytics and reporting
- [ ] Mobile app (React Native)
- [ ] API rate limiting
- [ ] Automated testing suite
- [ ] Multi-language support

---

**Built with ❤️ by the VersaTalent team**
