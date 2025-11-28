# 🚀 Netlify Deployment Guide

## Quick Deploy from GitHub

### Step 1: Log in to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign in (or sign up with GitHub)

### Step 2: Import from GitHub

1. Click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Authorize Netlify to access your GitHub account
4. Select the repository: **`versatalent-tech/versatalent`**
5. Branch: **`main`**

### Step 3: Configure Build Settings

**Build command:**
```
npm run build
```

**Publish directory:**
```
.next
```

**Functions directory:** (leave empty - Next.js handles this)

### Step 4: Add Environment Variables

Click **"Add environment variables"** and add these:

#### Required Variables:

```
DATABASE_URL
postgresql://neondb_owner:*************@ep-royal-leaf-a4rl6jau-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

NEXTAUTH_URL
https://YOUR-SITE-NAME.netlify.app

NEXTAUTH_SECRET
nfc-versatalent-secret-key-2025-change-in-production

NEXT_PUBLIC_SITE_URL
https://YOUR-SITE-NAME.netlify.app

NEXT_PUBLIC_STACK_PROJECT_ID
846d74a5-4d74-4c46-a89c-1f7c5bc397f5

NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
pck_5yanfb8k3bpm70wbx6m2yg81k8bx8cn7snwwq23xcvtfg

STACK_SECRET_SERVER_KEY
ssk_qa1gfsf4kbbghsrkgcp5n4sk79q4c0bfsfcnppqfsz67r
```

**Important:** Replace `YOUR-SITE-NAME` in `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` with your actual Netlify site name (you'll get this after deployment).

### Step 5: Deploy

1. Click **"Deploy versatalent"**
2. Wait for the build to complete (3-5 minutes)
3. Your site will be live at `https://YOUR-SITE-NAME.netlify.app`

### Step 6: Update Environment Variables (After First Deploy)

1. Go to **Site settings** → **Environment variables**
2. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` with your actual Netlify URL
3. Click **"Save"**
4. Go to **Deploys** → **Trigger deploy** → **"Deploy site"**

---

## Testing the NFC System

Once deployed, test these URLs:

### Admin Panel
```
https://YOUR-SITE-NAME.netlify.app/admin/nfc
```

### Sample NFC Card (from migration)
```
https://YOUR-SITE-NAME.netlify.app/nfc/SAMPLE-VIP-001
```

This should redirect to the VIP pass page.

---

## Troubleshooting

### Build Fails

**Check build logs** in Netlify dashboard for specific errors.

Common fixes:
- Make sure all environment variables are set
- Check that DATABASE_URL is correct
- Verify Neon database is accessible

### "Module not found" errors

- Make sure `package.json` includes all dependencies
- Try: **Deploys** → **Trigger deploy** → **"Clear cache and deploy site"**

### Database connection errors

- Verify DATABASE_URL in environment variables
- Check Neon database is running
- Test connection in Neon SQL Editor

### Pages load but show errors

- Check browser console for API errors
- Verify all environment variables are set correctly
- Check Netlify Functions logs

---

## Custom Domain (Optional)

To use a custom domain like `nfc.versatalent.com`:

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain: `nfc.versatalent.com`
4. Add DNS records as instructed by Netlify
5. Wait for DNS propagation (5-30 minutes)
6. Update environment variables with new domain

---

## 🎯 What to Test After Deployment

### 1. Admin Panel Access
- ✅ Can you access `/admin/nfc`?
- ✅ Can you see the Users tab?
- ✅ Does it show the sample VIP user?

### 2. Create Test User
- ✅ Click "Add User"
- ✅ Create an artist user
- ✅ User appears in the table

### 3. Create NFC Card
- ✅ Go to NFC Cards tab
- ✅ Create a card for your test user
- ✅ Note the Card UID

### 4. Test NFC Routing
- ✅ Visit `/nfc/YOUR-CARD-UID`
- ✅ Should redirect to artist or VIP page
- ✅ Check-in should be logged

### 5. Verify Check-in Log
- ✅ Go to Check-ins tab
- ✅ See the logged check-in
- ✅ Verify timestamp and source

---

## 📱 Next Steps

1. ✅ Deploy to Netlify
2. ✅ Test admin panel
3. ✅ Create test users and cards
4. ✅ Verify NFC routing works
5. 🔄 Order physical NFC tags
6. 🔄 Program tags with your Netlify URL
7. 🔄 Distribute to artists/VIPs

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Netlify build logs** - They show exactly what failed
2. **Verify environment variables** - Make sure all are set correctly
3. **Test locally first** - Run `npm run build` locally to catch errors
4. **Check Neon database** - Verify it's accessible

**Still stuck?** Contact support at support@versatalent.com
