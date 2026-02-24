# Admin Authentication Guide

## Overview

VersaTalent now includes **session-based authentication** for all admin routes. This protects sensitive administrative functions from unauthorized access.

---

## 🔐 Security Features

### What's Protected

All routes under `/admin/*` require authentication, including:

- `/admin/talents` - Talent management
- `/admin/events` - Event management
- `/admin/nfc` - NFC system management
- `/admin/vip` - VIP membership management
- `/admin/instagram` - Instagram feed configuration

### What's Public

- `/admin/login` - Login page (public access)
- All other site pages (`/`, `/talents`, `/events`, etc.)

### Authentication Method

- **Session-based authentication** using HTTP-only cookies
- **24-hour session duration** (automatically expires)
- **Secure cookies** in production (HTTPS only)
- **Environment-based credentials** for flexibility

---

## 🚀 Quick Start

### Development Setup

1. **Default credentials are already configured:**
   ```
   Username: admin
   Password: changeme
   ```

2. **Access the admin panel:**
   ```
   http://localhost:3000/admin/talents
   ```

3. **You'll be redirected to login:**
   ```
   http://localhost:3000/admin/login
   ```

4. **Enter credentials and login**

5. **You're now authenticated for 24 hours**

### Production Setup

⚠️ **CRITICAL:** Change credentials before deploying to production!

1. **Set environment variables:**

   In your production environment (Netlify, Vercel, etc.):

   ```bash
   ADMIN_USERNAME=your_secure_username
   ADMIN_PASSWORD=your_very_secure_password
   SESSION_SECRET=your_long_random_secret_key_minimum_32_chars
   ```

2. **Generate a secure session secret:**

   ```bash
   # Use this command to generate a random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Or use: https://generate-secret.vercel.app/32

3. **Use a strong password:**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Don't use common words or patterns

---

## 📝 Environment Variables

### Required Variables

Add these to your `.env.local` (development) or environment config (production):

```bash
# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
SESSION_SECRET=your-very-long-random-secret-key-change-in-production
```

### Variable Details

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ADMIN_USERNAME` | Admin username for login | `admin` | Yes |
| `ADMIN_PASSWORD` | Admin password for login | `changeme` | Yes |
| `SESSION_SECRET` | Secret key for session tokens | `default-secret...` | Yes |

⚠️ **Never commit `.env.local` to Git!** It's already in `.gitignore`.

---

## 🔑 Login Process

### Step-by-Step

1. **Navigate to any admin page:**
   - Example: `/admin/talents`

2. **Automatic redirect to login:**
   - You're redirected to `/admin/login?returnTo=/admin/talents`

3. **Enter credentials:**
   - Username and password from environment variables

4. **Session created:**
   - 24-hour session cookie set
   - Redirected back to original page

5. **Access granted:**
   - All admin pages accessible for 24 hours

### Session Expiry

- **Duration:** 24 hours from login
- **Auto-logout:** After 24 hours, must login again
- **Manual logout:** Click "Logout" button anytime

---

## 🛡️ How It Works

### Architecture

```
User → Admin Page → AuthGuard → Check Session → Allow/Deny
                                      ↓
                               API: /api/admin/auth/check
                                      ↓
                                 Cookie Validation
```

### Components

**1. AdminAuthGuard** (`src/components/auth/AdminAuthGuard.tsx`)
- Wraps admin pages
- Checks authentication on mount
- Redirects to login if unauthenticated

**2. Login Page** (`src/app/admin/login/page.tsx`)
- Username/password form
- Calls login API
- Redirects to returnTo URL after success

**3. Auth API Routes:**
- `/api/admin/auth/login` - Login endpoint
- `/api/admin/auth/logout` - Logout endpoint
- `/api/admin/auth/check` - Validation endpoint

**4. Auth Utilities** (`src/lib/auth/admin-auth.ts`)
- Credential verification
- Session token creation/validation
- Cookie management

### Security Measures

✅ **HTTP-only cookies** - JavaScript can't access tokens
✅ **Secure flag in production** - HTTPS only
✅ **SameSite=Lax** - CSRF protection
✅ **Session expiry** - Auto-logout after 24 hours
✅ **Environment-based secrets** - No hardcoded credentials
✅ **Return URL preservation** - Smooth UX after login

---

## 💻 Using in Admin Pages

### Example: Protect a New Admin Page

```tsx
"use client";

import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function MyAdminPage() {
  return (
    <AdminAuthGuard>
      <MainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">
                My Admin Page
              </h1>
              <LogoutButton variant="outline" />
            </div>
          </div>
        </section>

        {/* Your admin content here */}

      </MainLayout>
    </AdminAuthGuard>
  );
}
```

### Add Logout Button

```tsx
import { LogoutButton } from "@/components/auth/LogoutButton";

// In your component JSX:
<LogoutButton variant="outline" />

// Or with custom styling:
<LogoutButton
  variant="ghost"
  className="text-white hover:text-gold"
/>
```

---

## 🔄 Session Management

### Session Duration

- **Default:** 24 hours
- **Configurable** in `src/lib/auth/admin-auth.ts`:
  ```ts
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // milliseconds
  ```

### How Sessions Work

1. **Login:**
   - Server creates session token
   - Token contains: timestamp, expiry, random ID
   - Token stored in HTTP-only cookie

2. **Validation:**
   - Every admin page checks cookie
   - Verifies token exists and hasn't expired
   - Grants access if valid

3. **Logout:**
   - Cookie deleted
   - Session immediately invalid
   - Redirect to login page

### Session Token Format

```json
{
  "token": "1234567890-abc123xyz",
  "created": 1701619200000,
  "expires": 1701705600000
}
```

Base64 encoded and stored in cookie.

---

## 🐛 Troubleshooting

### Can't Login

**Problem:** "Invalid username or password"

**Solutions:**
1. Check `.env.local` has correct credentials
2. Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set
3. Restart dev server after changing `.env.local`
4. Check for typos in credentials

---

### Redirected to Login After Logging In

**Problem:** Login succeeds but immediately redirected back

**Solutions:**
1. Check browser console for errors
2. Verify cookies are enabled in browser
3. Check `SESSION_SECRET` is set in environment
4. Try clearing browser cookies
5. Restart dev server

---

### Session Expires Too Quickly

**Problem:** Logged out before 24 hours

**Solutions:**
1. Check system clock is correct
2. Verify `SESSION_DURATION` in `admin-auth.ts`
3. Check browser isn't clearing cookies on close

---

### "Already Logged In" but Can't Access Pages

**Problem:** Login page says logged in but admin pages redirect

**Solutions:**
1. Clear browser cookies
2. Logout and login again
3. Check `AuthGuard` is properly wrapping page
4. Verify `/api/admin/auth/check` returns 200

---

## 🔧 Customization

### Change Session Duration

Edit `src/lib/auth/admin-auth.ts`:

```ts
// Change from 24 hours to 7 days:
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

// Change to 1 hour:
const SESSION_DURATION = 60 * 60 * 1000;
```

### Multiple Admin Users

Current system supports **one admin user**. To support multiple users:

1. **Option A:** Use multiple environment variable sets
   ```bash
   ADMIN_USERNAME=admin1
   ADMIN_PASSWORD=password1

   ADMIN_USERNAME_2=admin2
   ADMIN_PASSWORD_2=password2
   ```

2. **Option B:** Integrate a user database
   - Create `users` table
   - Store hashed passwords (bcrypt)
   - Modify `verifyAdminCredentials()` to check database

3. **Option C:** Use NextAuth.js or similar
   - Full authentication solution
   - OAuth support
   - Role-based access control

### Custom Login Page Styling

Edit `src/app/admin/login/page.tsx` to customize:
- Colors
- Logo
- Layout
- Messages
- Background

---

## 🚀 Production Deployment

### Netlify

1. **Set environment variables:**
   - Go to: Site settings → Environment variables
   - Add:
     ```
     ADMIN_USERNAME=your_username
     ADMIN_PASSWORD=your_secure_password
     SESSION_SECRET=your_random_secret_key
     ```

2. **Deploy:**
   - Push to GitHub
   - Netlify auto-deploys
   - Test login at `https://your-site.netlify.app/admin/login`

### Vercel

1. **Set environment variables:**
   - Go to: Project Settings → Environment Variables
   - Add all three variables
   - Select Production and Preview

2. **Deploy:**
   - Push to GitHub
   - Vercel auto-deploys
   - Test login

### Other Platforms

1. Find environment variables section
2. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`
3. Deploy and test

---

## ⚠️ Security Best Practices

### DO's ✅

- ✅ Use strong, unique passwords (12+ characters)
- ✅ Generate random session secrets (32+ characters)
- ✅ Change default credentials before production
- ✅ Use HTTPS in production (enforced by cookies)
- ✅ Store credentials in environment variables
- ✅ Logout when finished with admin tasks
- ✅ Monitor for unauthorized access attempts

### DON'Ts ❌

- ❌ Use "admin" / "changeme" in production
- ❌ Commit credentials to Git
- ❌ Share credentials publicly
- ❌ Use same password across environments
- ❌ Disable HTTPS in production
- ❌ Store passwords in code
- ❌ Use weak session secrets

---

## 🎯 Future Enhancements

Consider implementing:

- [ ] **Multi-user support** - Multiple admin accounts
- [ ] **Role-based access control** - Different permission levels
- [ ] **Two-factor authentication (2FA)** - Extra security layer
- [ ] **Password hashing** - bcrypt or argon2
- [ ] **Login attempt limiting** - Rate limiting
- [ ] **Audit logging** - Track admin actions
- [ ] **Password reset** - Email-based recovery
- [ ] **OAuth integration** - Google/GitHub login
- [ ] **Session management UI** - View/revoke active sessions

---

## 📚 API Reference

### POST /api/admin/auth/login

**Request:**
```json
{
  "username": "admin",
  "password": "changeme"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Response (Error):**
```json
{
  "error": "Invalid username or password"
}
```

---

### POST /api/admin/auth/logout

**Request:** Empty body

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### GET /api/admin/auth/check

**Response (Authenticated):**
```json
{
  "authenticated": true
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false
}
```

---

## 📞 Support

For issues with authentication:

1. Check this guide's troubleshooting section
2. Verify environment variables are set correctly
3. Check browser console for errors
4. Review server logs
5. Test with default credentials first

---

**Last Updated:** December 3, 2025
**Version:** 151
**Security Level:** Production-ready with proper configuration
