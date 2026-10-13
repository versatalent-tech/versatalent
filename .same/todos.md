# VersaTalent Todos

_Last updated 13 Oct 2026. Loyalty: `docs/LOYALTY_AUDIT_AND_LAUNCH_PLAN.md`. CRM: `docs/CRM_PORTAL_PLAN.md`._

## 1. Loyalty: open items (stages 1–4 are built; see docs/LOYALTY_AUDIT_AND_LAUNCH_PLAN.md)
- [ ] Set up a test harness (Vitest + Neon branch): tier boundaries, discounts, ledger (`loyalty_post`), claims, refunds, referrals
- [ ] Staff card tapped on a phone: show a staff card page with a link to `/staff/login` (today it redirects to `/admin`, which bounces to `/admin/login`)
- [ ] Guest card tapped on a phone: show a proper page (today it stays on "Redirecting you now…")
- [ ] Member endpoints readable by anyone with a member ID: `/api/vip/memberships/[user_id]` (GET), `/api/vip/points-log?user_id=`, `/api/nfc/checkins?user_id=`; trim the public card lookup
- [ ] Sign the macOS NFC Bridge app so staff don't get a security warning
- [x] Commit `docs/vprivilege-benefit-sheet.html` (costed benefit sheet)

## 2. Loyalty: decisions before switching things on
Built but off: Founding Membership sales, rewards, referrals. Automatic emails need a provider and domain.
- [ ] Programme terms and privacy notice approved (drafts at `/membership/terms`)
- [ ] Minimum age: 18+ for everyone, or only for drink rewards
- [ ] Card fulfilment: who posts cards and how quickly
- [ ] Earning rules per ledger (reward share of each award, default 100%)
- [ ] Reward point costs (current values are placeholders), stock and limits
- [ ] Opening reward balances: 0 or carry over (10 points in total)
- [ ] Black discount to 10% (VIP → Point Rules, a settings change)
- [ ] Confirm the open figures in the benefit sheet (VAT, card fee, drink cost, card price, guest-pass cost, members' night cost, presale support)
- [ ] Email provider and owned domain, so outreach lists can send automatically
- [ ] Backups: longer Neon restore window or scheduled snapshots
- [x] Paid benefits are managed in the admin; changes apply to new purchases only
- [x] One-off £29.99 payment for 12 months, no auto-renewal

## 3. CRM plan: remaining phases
- [ ] 4 Outreach v1 (prospecting; separate from the member outreach queue)
- [ ] 5 KPIs (combine with loyalty reporting)

## 4. Meetings go-live
- [x] Run migration 033 on production (13 Oct 2026)
- [ ] Later stage, AI notes (built, off): privacy notice line about Anthropic, then add `ANTHROPIC_API_KEY` in Netlify (Functions scope) and redeploy; test one draft
- [ ] Later: audio recordings (needs a speech-to-text service), link meetings to bookings, share notes with talents

## 5. Housekeeping
- [ ] Clean up unused variables and imports (101 lint warnings)
- [ ] Replace `<img>` with Next.js `Image` (15 warnings in 13 files)

## Completed
- [x] Upload NFC Bridge release assets to GitHub (v1.1.0, all 5 platforms)
- [x] Escape apostrophes in JSX strings (lint reports 0 errors)
- [x] Fix SQL parameter placeholder bug in talents.ts updateTalent function
- [x] Add multi-select talent picker for event creation form
- [x] Auto-complete events as "completed" after their date passes
- [x] Fix admin/nfc page client-side error - NFCCardRegistration.tsx was empty
- [x] Deploy fix to production (v249)
- [x] Fix NFC reader CCID protected class browser limitation (v251)
  - Added WebSocket bridge support for physical NFC readers
  - Added Simulation Mode for testing without hardware
  - Improved error messaging and UI guidance
- [x] Create NFC Bridge server documentation (for users who want to use physical NFC readers)
- [x] Build NFC Bridge executables for all platforms (Windows, macOS Intel/ARM, Linux x64/ARM)
- [x] Create GitHub repository for NFC Bridge Server (https://github.com/versatalent-tech/nfc-bridge-server)
- [x] Remove "VersaTalent in Action" section from homepage
- [x] Remove "Follow Our Artists" / DynamicInstagramFeed section from homepage
- [x] CRM phases 0–3 and talent payouts (see docs/CRM_PORTAL_PLAN.md)
- [x] VIP tiers: yearly requalification, multipliers, member discounts (migration 023)
- [x] Loyalty audit and V•PRIVILEGE costed benefit sheet (9 Oct 2026)
- [x] Loyalty stage 1: online sign-up, card delivery and fulfilment queue (migration 029)
- [x] Phone card taps are logged, not counted as check-ins
- [x] Loyalty stage 2: Founding Membership, one-off £29.99 (migration 030, off sale)
- [x] Loyalty stage 3: status and reward ledgers, rewards and claims, till refunds (migration 031, rewards closed)
- [x] CRM phase 2b: private documents on bookings, deals and talent profiles (migration 034)
- [x] CRM phase 3b: meetings with Claude-drafted notes and action items → tasks (migration 033)
- [x] Loyalty stage 4: referrals and member outreach queue without email (migration 032, referrals closed)
