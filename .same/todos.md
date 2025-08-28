# Versatalent Project Todos

## ✅ Completed
- [x] Deploy authentication-enabled site to Netlify (live)
- [x] Fix localhost redirect by setting proper envs (NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NEXTAUTH_SECRET)
- [x] Sync codebase to GitHub (main)
- [x] Add Previous Clubs table to Antonio Monteiro's profile
- [x] Move Career data to talents model (data-driven previousClubs)
- [x] Update Antonio's previous clubs (South Leeds FC, Shirebrook Town FC)
- [x] Add league field to previousClubs and render in table
- [x] Implement sorting (most recent first) for Career table

## 🔐 Phase 11: User Authentication System - COMPLETED ✅
- [x] NextAuth.js with credentials + provider scaffolding
- [x] Middleware route protection and role-based access (admin/talent)
- [x] Sign-in, sign-up, unauthorized pages and header auth UI

## 📊 Analytics - COMPLETED (Phase 10)
- [x] Real-time analytics (SSE), dashboards, and API routes
- [x] Metrics, demographics, traffic sources, content performance

## 🚀 Deployment
- [x] Netlify dynamic deployment configured
- [x] Deployed latest changes (auth + talents data + career table) live
- [x] Synced repository to GitHub: versatalent-tech/versatalent (main)

## 🧩 In Progress / Next Up
1) Social authentication (optional but recommended)
   - [ ] Enable Google OAuth: set GOOGLE_CLIENT_ID/SECRET and test
   - [ ] Enable GitHub OAuth: set GITHUB_CLIENT_ID/SECRET and test
   - [ ] Update Sign-in UI to show/hide social buttons based on env
2) Career data enhancements (data model + UI)
   - [ ] Extend PreviousClub with optional fields: position, minutes, assists, competition
   - [ ] Add UI columns toggled by availability (only render if present)
   - [ ] Add validation/sorting utilities (normalize ranges, guard bad input)
3) Data export & admin UX
   - [ ] Add CSV/JSON export button to Career table (Antonio + generic)
   - [ ] Build lightweight Admin page to edit talents and clubs (protected to admin role)
   - [ ] Persist edits (for now local JSON patching; later connect real DB)
4) Dashboard & performance polish
   - [ ] Fix remaining TypeScript any warnings gradually (no prod impact)
   - [ ] Add error boundaries for analytics requests in preview/iframe contexts
   - [ ] Improve hydration stability by deferring non-deterministic calls
5) CI/CD and quality gates
   - [ ] Add GitHub Actions: lint, type-check, build on PRs
   - [ ] Preview deploys per PR (Netlify)
   - [ ] Basic e2e smoke (Playwright) for auth -> dashboard flow

## 📝 Notes
- To add/update career data for any talent, edit `src/lib/data/talents.ts` -> `previousClubs`
- Sorting treats "Present" as the most recent year and orders by end-year then start-year
- If you want additional fields, tell me which and I'll extend the schema + UI accordingly
