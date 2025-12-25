# ✅ Netlify Deployment Checklist

**Use this checklist to ensure your Netlify deployment succeeds**

---

## Pre-Deployment Checklist

### 1. Code Configuration ✅ DONE

- [x] `netlify.toml` configured with Essential Next.js plugin
- [x] `next.config.js` does NOT have `output: 'export'`
- [x] Build command set to `npm install && npm run build`
- [x] Publish directory set to `.next`

**Status**: ✅ Already configured by AI

---

### 2. Push to GitHub

- [ ] **Run these commands**:

```bash
cd versatalent
git add -A
git commit -m "Configure Netlify with Essential Next.js plugin"
git push origin main
```

---

### 3. Netlify Dashboard Configuration

#### A. Enable Essential Next.js Plugin

- [ ] Go to: **Netlify Dashboard** → **Your Site** → **Site settings** → **Build & deploy** → **Build plugins**
- [ ] Find: **"Essential Next.js Build Plugin"**
- [ ] Click: **"Install"** or **"Enable"**
- [ ] Save changes

**CRITICAL**: Without this, your site won't work!

#### B. Set Environment Variables

Go to: **Site settings** → **Build & deploy** → **Environment variables**

Click **"Add a variable"** for each of these:

- [ ] `DATABASE_URL` = `your_neon_database_url`
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` or `sk_live_...`
- [ ] `STRIPE_PUBLISHABLE_KEY` = `pk_test_...` or `pk_live_...`
- [ ] `ADMIN_USERNAME` = `admin` (or your choice)
- [ ] `ADMIN_PASSWORD` = `your_secure_password`
- [ ] `STAFF_USERNAME` = `staff` (or your choice)
- [ ] `STAFF_PASSWORD` = `your_secure_password`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://your-site-name.netlify.app`

**Note**: Use your actual Netlify URL for `NEXT_PUBLIC_APP_URL`

#### C. Build Settings

- [ ] Go to: **Site settings** → **Build & deploy** → **Build settings**
- [ ] Verify:
  - Build command: `npm install && npm run build`
  - Publish directory: `.next`
  - Branch: `main`

---

### 4. Trigger Deploy

- [ ] Go to: **Deploys** tab
- [ ] Click: **"Trigger deploy"** → **"Deploy site"**
- [ ] Wait for build to complete (2-5 minutes)

---

## During Deployment

### Monitor Build Logs

- [ ] Watch the deploy log in real-time
- [ ] Look for these success indicators:
  - ✅ "Installing dependencies"
  - ✅ "Building Next.js application"
  - ✅ "Compiled successfully"
  - ✅ "Creating an optimized production build"
  - ✅ "Essential Next.js plugin loaded"
  - ✅ "Deploy succeeded"

### Watch for Errors

If you see errors like:
- ❌ "Plugin failed to load"
- ❌ "Build failed"
- ❌ "Missing environment variables"

**Stop and check**:
1. Is plugin enabled in dashboard?
2. Are environment variables set?
3. Did GitHub push succeed?

---

## Post-Deployment Verification

### 1. Basic Site Check

- [ ] Visit your Netlify URL (e.g., `https://your-site.netlify.app`)
- [ ] **Expected**: Homepage loads (NOT "Page not found")
- [ ] **Check**: No errors in browser console (F12)

### 2. Test Key Pages

- [ ] **Homepage** (`/`) - Should load with hero section
- [ ] **Talents** (`/talents`) - Should show talent cards
- [ ] **Events** (`/events`) - Should show event listings
- [ ] **Admin Login** (`/admin/login`) - Should show login form

### 3. Test API Routes

Open browser console and try:

```javascript
fetch('https://your-site.netlify.app/api/talents')
  .then(r => r.json())
  .then(console.log)
```

- [ ] **Expected**: Returns talent data (or auth error if protected)
- [ ] **NOT Expected**: 404 or "Page not found"

### 4. Test Admin Functions

- [ ] Go to: `/admin/login`
- [ ] Enter your admin credentials
- [ ] **Expected**: Redirects to admin dashboard
- [ ] **Check**: Can view talents, events, etc.

### 5. Test Images

- [ ] Check if images load on homepage
- [ ] Check if talent profile images display
- [ ] Check if event images show
- [ ] **Expected**: All images visible (no broken image icons)

---

## Common Issues & Fixes

### Issue: Build Fails Immediately

**Check**:
- [ ] Is plugin enabled in Netlify dashboard?
- [ ] Did you push latest code to GitHub?

**Fix**:
1. Enable plugin in dashboard
2. Clear cache and redeploy

### Issue: Build Succeeds but "Page Not Found"

**Check**:
- [ ] Is build command correct? (`npm install && npm run build`)
- [ ] Is publish directory correct? (`.next`)
- [ ] Is plugin actually running? (check build logs)

**Fix**:
1. Verify build settings in Netlify
2. Trigger clean deploy (clear cache)

### Issue: API Routes Return 404

**Check**:
- [ ] Are redirects configured in `netlify.toml`?
- [ ] Did plugin create Netlify Functions?

**Fix**:
1. Check build logs for function deployment
2. Go to Functions tab in Netlify dashboard
3. Should see `___netlify-handler` function

### Issue: Database Connection Fails

**Check**:
- [ ] Is `DATABASE_URL` set correctly?
- [ ] Is Neon database active?

**Fix**:
1. Verify environment variable value
2. Test database connection in Neon Console
3. Check Netlify Functions logs for specific error

### Issue: Images Don't Load

**Check**:
- [ ] Are image URLs correct?
- [ ] Is `NEXT_PUBLIC_APP_URL` set correctly?

**Fix**:
1. Verify image paths in code
2. Check browser console for CORS errors
3. Ensure `next.config.js` has correct remote patterns

---

## Success Indicators ✅

Your deployment is successful when:

✅ Build completes without errors
✅ Deploy succeeds and shows "Published"
✅ Site loads at Netlify URL (no "Page not found")
✅ Homepage displays correctly
✅ Navigation works
✅ Talents page shows talent cards
✅ Events page shows events
✅ Admin login accessible
✅ API routes respond (test `/api/talents`)
✅ Images load correctly
✅ No console errors in browser (F12)

---

## Final Verification

### Quick Test Script

Run this in your browser console on the deployed site:

```javascript
// Test 1: Check if Next.js loaded
console.log('Next.js loaded:', window.next !== undefined);

// Test 2: Test API route
fetch('/api/talents')
  .then(r => r.json())
  .then(data => console.log('API works:', data))
  .catch(err => console.error('API error:', err));

// Test 3: Check environment
console.log('App URL:', process.env.NEXT_PUBLIC_APP_URL);
```

**Expected output**:
- Next.js loaded: true
- API works: [array of talents or auth error]
- App URL: https://your-site.netlify.app

---

## 🎊 Deployment Complete!

If all checkboxes are ticked and all tests pass:

**Congratulations!** Your Next.js 15 app is successfully deployed on Netlify! 🎉

---

## 📞 Need Help?

If you're stuck:

1. **Check build logs** - Most issues are visible here
2. **Verify environment variables** - Missing variables cause failures
3. **Test locally** - Run `npm run build` to ensure code builds
4. **Read detailed guide** - See `NETLIFY_DEPLOYMENT_FIX_DETAILED.md`

---

**Last Updated**: December 17, 2025
**Configuration**: Netlify + Essential Next.js Plugin + Next.js 15
