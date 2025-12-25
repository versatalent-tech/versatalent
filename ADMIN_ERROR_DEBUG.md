# 🔍 Admin Pages Error - Debug Guide

**Error**: "s2.snapshot is not a function"
**Affected**: Only admin pages (/admin/*)
**Working**: Homepage, talents, events pages

---

## 📊 Get Full Error Details

**Please check your browser console**:

1. Open the admin talents page: `https://your-site.netlify.app/admin/talents`
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for the full error message

**Please share**:
- The complete error message
- The stack trace (click the arrow to expand)
- The file name where error occurs (e.g., `framework-xyz.js:123`)

---

## 🔧 Quick Fixes to Try

### Fix 1: Clear All Cache
```
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear site data"
4. Reload
```

### Fix 2: Disable Service Worker
```
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Click "Unregister" if any exist
4. Reload
```

### Fix 3: Check Network Tab
```
1. Open DevTools (F12)
2. Go to Network tab
3. Reload the admin page
4. Look for any failed requests (red)
5. Check which JS files are loaded
```

---

## 🎯 What to Check

**In Console, look for**:
- Full error message with file name
- Line number in the JavaScript file
- Which component/library is failing

**Share this info and I can fix it immediately!**
