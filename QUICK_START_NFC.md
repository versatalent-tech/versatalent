# 🚀 Quick Start Guide - VersaTalent NFC System

## ⚡ Fast Setup (5 minutes)

### 1. Database Setup

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy your connection string
3. Create `.env.local` file:

```bash
DATABASE_URL=your-neon-connection-string-here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Run the migration:
   - Open Neon SQL Editor
   - Copy & paste contents from `src/db/migrations/001_initial_schema.sql`
   - Execute

### 2. Install & Run

```bash
cd versatalent
bun install
bun run dev
```

### 3. Access Admin Panel

Navigate to: `http://localhost:3000/admin/nfc`

## 🎯 Test the System

### Create Your First NFC Card

1. **Create a user:**
   - Go to Admin → NFC → Users tab
   - Click "Add User"
   - Fill in: Name, Email, Role (choose "artist" or "vip")
   - Save

2. **Create an NFC card:**
   - Go to NFC Cards tab
   - Click "Add NFC Card"
   - Select the user you just created
   - Note the Card UID (e.g., `CARD-1234567890-ABC`)
   - Save

3. **Test the card URL:**
   - Open browser: `http://localhost:3000/nfc/CARD-1234567890-ABC`
   - Should redirect to artist/VIP page
   - Check-in should be logged

4. **View the check-in:**
   - Go to Check-ins tab
   - You should see the logged check-in

## 📱 Program Physical NFC Cards

### iOS & Android
1. Download "NFC Tools" app
2. Write → Add Record → URL/URI
3. Enter: `https://yourdomain.com/nfc/YOUR-CARD-UID`
4. Write to NFC tag

## 📖 Full Documentation

See `NFC_SYSTEM_README.md` for complete documentation including:
- System architecture
- All API endpoints
- Admin features
- Workflows and troubleshooting

## 🔧 Key URLs

- **Main Site**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin/nfc
- **NFC Router**: http://localhost:3000/nfc/{card_uid}
- **Artist Profiles**: http://localhost:3000/artist/{id}
- **VIP Passes**: http://localhost:3000/vip/{id}

## ✅ Quick Checklist

- [ ] Neon database created
- [ ] .env.local configured
- [ ] Database migration executed
- [ ] Dependencies installed
- [ ] Dev server running
- [ ] Admin panel accessible
- [ ] Test user created
- [ ] Test NFC card created
- [ ] NFC routing tested
- [ ] Check-in logged successfully

## 💡 Next Steps

1. Create more users (artists, VIPs)
2. Assign NFC cards to users
3. Create events for check-in tracking
4. Program physical NFC tags
5. Deploy to production

## 🆘 Need Help?

- **Full Docs**: See `NFC_SYSTEM_README.md`
- **Troubleshooting**: See README section "Troubleshooting"
- **Support**: support@versatalent.com
