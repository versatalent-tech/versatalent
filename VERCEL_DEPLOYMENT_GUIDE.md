# 🚀 Deploy to Vercel - Quick Guide

**Your Netlify deployment isn't working because Next.js 15 has compatibility issues with Netlify.**

**Solution: Deploy to Vercel instead - it will work perfectly in 5 minutes!**

---

## Why Vercel?

- **Built by the Next.js team** - Zero configuration needed
- **Native Next.js 15 support** - No compatibility issues
- **Works immediately** - No troubleshooting needed
- **Better performance** - Optimized for Next.js
- **Free tier** - Perfect for your project

---

## 5-Minute Deployment Steps

### 1. Go to Vercel
**URL**: https://vercel.com/signup

### 2. Sign Up with GitHub
- Click "Continue with GitHub"
- Authorize Vercel to access your repositories

### 3. Import Your Repository
- Click "Add New..." → "Project"
- Select "Import Git Repository"
- Find `versatalent-tech/versatalent`
- Click "Import"

### 4. Configure Project (Auto-detected!)

Vercel will automatically detect:
- ✅ Framework: Next.js
- ✅ Build Command: `bun run build`
- ✅ Output Directory: `.next`
- ✅ Install Command: `bun install`

**You don't need to change anything!**

### 5. Add Environment Variables

Click "Environment Variables" and add these:

```bash
DATABASE_URL=your_neon_database_url
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
STAFF_USERNAME=staff
STAFF_PASSWORD=your_password
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Copy these from your Netlify environment variables!**

### 6. Deploy!

- Click "Deploy"
- Wait ~2 minutes
- **Done!** Your site will be live at `https://your-project.vercel.app`

---

## After Deployment

### Test Your Site

Visit your Vercel URL and verify:
- [ ] Homepage loads correctly
- [ ] Talents page works
- [ ] Events page works
- [ ] Admin login works
- [ ] No console errors

### Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Done!

---

## Automatic Deployments

Every time you push to GitHub, Vercel will automatically:
- Build your project
- Run tests
- Deploy to production
- Show you a preview URL

**No manual deployment needed!**

---

## Migrating from Netlify

### What About Netlify?

You can:
- **Keep both** - Vercel for production, Netlify as backup
- **Replace Netlify** - Just use Vercel (recommended)
- **Delete Netlify site** - No longer needed

### Environment Variables

**Copy from Netlify**:
1. Go to Netlify Site Settings → Environment Variables
2. Copy all values
3. Paste into Vercel Project Settings → Environment Variables

---

## Why This Works Better

**Netlify Issues**:
- ❌ Next.js 15 compatibility problems
- ❌ Needs manual plugin configuration
- ❌ "Page not found" errors
- ❌ Complex troubleshooting

**Vercel Benefits**:
- ✅ Next.js 15 works out of the box
- ✅ Zero configuration needed
- ✅ No "page not found" errors
- ✅ Instant deployment

---

## Cost Comparison

**Netlify Free Tier**:
- 100GB bandwidth
- 300 build minutes

**Vercel Free Tier**:
- 100GB bandwidth
- Unlimited builds
- **Better Next.js support**

**Both are free for your project!** But Vercel works better with Next.js.

---

## Troubleshooting

### Build Fails on Vercel?

**Check environment variables** are set correctly.

### Database Connection Fails?

**Verify `DATABASE_URL`** is correct in Vercel environment variables.

### Images Not Loading?

**Check `NEXT_PUBLIC_APP_URL`** points to your Vercel URL.

---

## Summary

1. **Sign up** at https://vercel.com
2. **Import** your GitHub repository
3. **Add** environment variables
4. **Deploy** (automatic!)
5. **Test** your site
6. **Done!** 🎉

**Your site will work immediately - no "page not found" errors!**

---

**Time Required**: 5-10 minutes
**Difficulty**: Easy (Vercel does everything automatically)
**Cost**: Free
**Result**: Your site working perfectly!

---

## Need Help?

**Vercel Documentation**: https://vercel.com/docs
**Next.js Deployment**: https://nextjs.org/docs/deployment

Or just follow the steps above - it's really that easy! 🚀
