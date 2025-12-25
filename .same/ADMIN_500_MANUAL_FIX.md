# 🔧 Manual Fix for Admin 500 Error

**Error**: "s2.snapshot is not a function" - caused by Radix UI Dialog incompatibility
**Solution**: Replace Header component with simple version on admin pages

---

## Quick Fix (5 minutes)

You need to create 2 new files and update 2 existing files.

---

## Step 1: Create SimpleHeader Component

**File**: `src/components/layout/SimpleHeader.tsx`

Create this new file with the following content:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Talent Directory", href: "/talents" },
  { name: "Events", href: "/events" },
  { name: "Join Us", href: "/join.html" },
  { name: "For Brands", href: "/for-brands" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact.html" },
];

export function SimpleHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-background/80 backdrop-blur-md z-50 border-b border-gray-200 shadow-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">VersaTalent</span>
            <div className="flex items-center">
              <div className="relative h-16 w-16">
                <Image
                  src="/images/versatalent-new-logo.png"
                  alt="VersaTalent Logo"
                  fill
                  sizes="(max-width: 768px) 64px, 64px"
                  quality={90}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Mobile menu button - simple version without Sheet */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
            <span className="sr-only">
              {mobileMenuOpen ? "Close menu" : "Open menu"}
            </span>
          </Button>
        </div>

        {/* Desktop menu */}
        <div className="hidden lg:flex lg:gap-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-foreground hover:text-gold transition duration-150"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Button
            asChild
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-background"
          >
            <Link href="/contact.html">Get in touch</Link>
          </Button>
        </div>
      </nav>

      {/* Simple mobile menu - no animations */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-background">
          <div className="px-6 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-foreground hover:bg-gold-10 hover:text-gold rounded-lg"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/contact.html"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-gold hover:bg-gold-10 rounded-lg"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
```

---

## Step 2: Create SimpleMainLayout Component

**File**: `src/components/layout/SimpleMainLayout.tsx`

Create this new file:

```typescript
import type React from "react";
import { SimpleHeader } from "./SimpleHeader";
import { Footer } from "./Footer";

/**
 * Simplified MainLayout for admin pages
 * Uses SimpleHeader without Radix UI Dialog/Sheet to avoid compatibility issues
 */
export function SimpleMainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SimpleHeader />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
```

---

## Step 3: Update Admin Login Page

**File**: `src/app/admin/login/page.tsx`

**Change line 4** from:
```typescript
import { MainLayout } from "@/components/layout/MainLayout";
```

**To**:
```typescript
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
```

**Then replace all occurrences** of `MainLayout` with `SimpleMainLayout` in this file (there are 3 places).

---

## Step 4: Update AdminAuthGuard

**File**: `src/components/auth/AdminAuthGuard.tsx`

**Change line 3** from:
```typescript
import { MainLayout } from "@/components/layout/MainLayout";
```

**To**:
```typescript
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
```

**Then change line 38** from:
```typescript
      <MainLayout>
```

**To**:
```typescript
      <SimpleMainLayout>
```

**And line 44** from:
```typescript
      </MainLayout>
```

**To**:
```typescript
      </SimpleMainLayout>
```

---

## Step 5: Deploy to Netlify

After making these changes:

1. **Commit changes**:
   ```bash
   git add -A
   git commit -m "Fix admin 500 error - use simple header without Radix Dialog"
   git push origin main
   ```

2. **Wait for Netlify** to auto-deploy (2-5 minutes)

3. **Test the fix**:
   - Go to: `https://your-site.netlify.app/admin/login`
   - Page should load WITHOUT the 500 error
   - You should see the login form

---

## What This Fixes

**Problem**:
- Radix UI's Dialog/Sheet component (used in the Header) has compatibility issues with Next.js 15
- Causes "s2.snapshot is not a function" error
- Prevents admin pages from loading

**Solution**:
- Created SimpleHeader without Radix UI components
- Uses basic React state for mobile menu (no animations)
- No Dialog/Sheet component = no compatibility issues
- Admin pages use SimpleHeader, public pages still use regular Header

---

## Expected Result

**After the fix**:
- ✅ `/admin/login` loads successfully
- ✅ No "s2.snapshot is not a function" error
- ✅ Login form appears
- ✅ Can log in and access admin pages
- ✅ Public pages (/, /talents, /events) still work normally

---

## Alternative: Use Netlify UI

If you can't push via git, you can manually edit files in Netlify:

1. Go to Netlify Dashboard → Your site → Site configuration
2. Navigate to Code → Deploys
3. Click "Deploy from GitHub"
4. Manually create/edit these 4 files in GitHub web interface
5. Trigger new deploy in Netlify

---

**Need Help?**
- If you can push to GitHub, just copy these 2 new files and update the 2 existing files
- Commit and push
- Wait for Netlify to deploy
- Test `/admin/login`

**The 500 error should be gone!** 🎉
