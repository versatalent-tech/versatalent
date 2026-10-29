# VersaTalent Todos

_Last updated 17 Oct 2026. Loyalty: `docs/LOYALTY_AUDIT_AND_LAUNCH_PLAN.md`. CRM, documents, artist cards, prospecting and KPIs: `docs/CRM_PORTAL_PLAN.md`. Ticket sales: Admin → Tickets. All migrations up to 038 are on production. Tests: `npm run test:e2e` (32 tests, also run on GitHub for every PR)._

## 1. Decisions waiting (business owner)
Built but switched off until these are made: Founding Membership sales, rewards, referrals. Ticket sales are built and live, but nothing is on sale until ticket types are added.
- [ ] Programme terms and privacy notice approved (drafts at `/membership/terms`)
- [ ] Minimum age: 18+ for everyone, or only for drink rewards
- [ ] Card fulfilment: who posts cards and how quickly
- [ ] Earning rules per ledger (reward share of each award, default 100%)
- [ ] Reward point costs (current values are placeholders), stock and limits
- [ ] Opening reward balances: 0 or carry over (10 points in total)
- [ ] Black discount to 10% (VIP → Point Rules, a settings change)
- [ ] Confirm the open figures in the benefit sheet (VAT, card fee, drink cost, card price, guest-pass cost, members' night cost, presale support)
- [ ] Ticket terms approved (draft at `/tickets/terms`), and the ticket lines added to the privacy notice
- [ ] Ticket points rate (VIP → Point Rules → Ticket Points; starts at the till rate, 1 point per £3)
- [ ] Email provider and owned domain: unlocks automatic member emails, ticket confirmation emails and prospecting v2
- [ ] Backups: longer Neon restore window or scheduled snapshots

## 2. Check after the latest deploys
- [ ] Instagram posts (phase 1): migration 039 is on production (28 Oct 2026). Admin → Instagram should list the 5 carried-over posts (Deejay WG ×2, Jessica Dias ×2, João Rodolfo ×1); add Antonio Monteiro's and others' posts there, and check the homepage section and a talent profile
- [ ] Netlify has deployed `main` (latest merge `1d28b75`); merges didn't always trigger builds in the past
- [ ] Tasks for road managers and talents: in "Weekly Meeting DJs", give the actions to Milo Ramos and Deejay WG and add them as tasks; Milo sees them under "Your tasks" on his dashboard, William Goncalves under "Your to-dos" in the portal
- [ ] Booking document: the photo uploaded on 16 Oct is on "Dj set + equipment" (24 Oct), not "Birthday Party"; confirm it's in the right place, or ask to move it
- [ ] Talent profiles show real figures (jobs, events, clients); add earlier work in Admin → Talents → Edit → Profile figures
- [ ] Ticket points: buy a £3+ test ticket with a membership email and check the points arrive, then refund it (the £1 test on 15 Oct paid through SumUp and refunded correctly, but wasn't a member purchase)
- [ ] Event page shows "Buy tickets" for events with ticket types; the external tickets link still shows for events without them
- [ ] Tap an artist card on a phone: talent page with the Book / Save contact (/ Press kit) bar; send a test enquiry and find it in CRM → Enquiries marked "Card tap"
- [ ] Upload a comp card in Bookings → Talent documents and switch on "Public press kit"
- [ ] Talent calendars: team calendar filtered by a talent shows their events; portal Bookings page shows "Events you're in"
- [ ] Create the first prospecting campaign, add contacts, start it, work "Due today"
- [ ] Set this month's KPI targets (CRM → KPIs, target icon); the nightly snapshots are already running

## 3. To build
- [ ] Instagram phase 2 (built): run migration 040 on production before deploying, then remove it from `e2e/pending-migrations.txt`. Set up the Meta app and Netlify variables (`docs/INSTAGRAM_SETUP.md`), connect @versatalent in Admin → Instagram, and ask each talent to connect from their portal
- [ ] Instagram phase 3: insights page (engagement by talent, format, content tags, posting time)
- [ ] More tests (Playwright, `e2e/tests`): loyalty at the till (tier boundaries, discounts, till refunds), reward claims, referrals; CRM (document access rules, prospecting steps and outcomes, KPI figures); bookings and talent calendars; booking documents; staff and guest card taps
- [ ] Sign the macOS NFC Bridge app so staff don't get a security warning

## 4. Later
- [ ] AI meeting notes (built, off): privacy notice line about Anthropic, add `ANTHROPIC_API_KEY` in Netlify (Functions scope), redeploy, test one draft
- [ ] Meetings: audio recordings (needs a speech-to-text service), link meetings to bookings, share notes with talents
- [ ] Prospecting v2: send through an email provider, open/reply tracking, one-click unsubscribe
- [ ] KPIs: targets per person or per talent; outstanding invoices once invoicing exists
- [ ] Artist card: choose which profile sections each card shows (e.g. measurements)
- [ ] Artist card: tap and enquiry counts per talent, shown in their portal
- [ ] Artist card: "Recently performed at / next appearance" on the profile
- [ ] Tickets: confirmation email with the order link (needs the email provider)
- [ ] Tickets: scan a QR code at the door instead of the name list; per-event age limit (18+) on the form
- [ ] Tickets: discount codes, member presale (48-hour early access benefit) and member-only ticket types
- [ ] Tickets: link ticket buyers to CRM contacts / newsletter when they agree to marketing
- [ ] Tasks: email or text people when they're given a task (needs the email provider)
- [ ] Talent portal logins switched off for Claudio Costa and Joao Rodolfo: switch them on if they should get tasks or see bookings
- [ ] Card payments: Solo Lite works through the SumUp app (till → "SumUp app" + transaction code); a SumUp Solo would let the till send amounts straight to the reader

## 5. Housekeeping
- [ ] Clean up unused variables and imports (100 lint warnings)
- [ ] Replace `<img>` with Next.js `Image` (15 warnings)

## Completed
### October 2026
- [x] Tests run on GitHub for every PR and on `main` (NEON_API_KEY Actions secret set; first run passed 29/29)
- [x] Online ticket payments confirmed working with a real £1 test purchase and refund (15 Oct)
- [x] Tasks and meeting action items can go to road managers (dashboard "Your tasks") and talents with a portal login (portal "Your to-dos"); managers only to their own talents
- [x] Test harness: Playwright tests against a temporary database copy and a pretend SumUp, on a production build; 29 tests for tickets, talent profile figures, permissions, the points ledger and page loads; GitHub Actions workflow (`npm run test:e2e`, `e2e/README.md`)
- [x] Fixed: Admin → Tickets could show an older event's orders after switching quickly (found by the tests)
- [x] Ticket sales on the website: ticket types with limits and sale dates, buyer form (Instagram always asked), SumUp payment, points for members, refunds, door list, analysis and CSV export (migration 038, PR #47)
- [x] Talent profile hero shows real jobs, events and clients, with admin additions (migration 037, PR #46)
- [x] CRM phase 4: Prospecting campaigns, due-today queue, outcomes, deals (migration 036, PR #44)
- [x] CRM phase 5: KPIs with targets, trends and nightly snapshots (migration 036, PR #44)
- [x] Artist card buttons: booking enquiry form, save contact, public press kit, link previews (PR #43)
- [x] Card-tap privacy fixes: no user ids from card lookups, member data VIP-only, inactive talents hidden, staff and guest card pages (migration 035, PR #42)
- [x] CRM phase 2b: private documents on bookings, deals and talent profiles, with expiry reminders (migration 034, PR #42)
- [x] V•PRIVILEGE costed benefit sheet committed (PR #41)
- [x] Events shown in talents' calendars, phone feeds and portal (PR #40)
- [x] CRM phase 3b: meetings with notes and action items → tasks; AI drafting built but off (migration 033, PR #39)
- [x] Decided: paid benefits managed in the admin, changes apply to new purchases only
- [x] Decided: one-off £29.99 payment for 12 months, no auto-renewal
- [x] Decided: AI meeting notes later; talent documents uploaded by the team only
- [x] Loyalty stage 4: referrals and member outreach queue without email (migration 032, referrals closed)
- [x] Loyalty stage 3: status and reward ledgers, rewards and claims, till refunds (migration 031, rewards closed)
- [x] Loyalty stage 2: Founding Membership, one-off £29.99 (migration 030, off sale)
- [x] Loyalty stage 1: online sign-up, card delivery and fulfilment queue (migration 029)
- [x] Phone card taps are logged, not counted as check-ins
- [x] Loyalty audit and launch plan
- [x] CRM phases 0–3 and talent payouts
- [x] VIP tiers: yearly requalification, multipliers, member discounts (migration 023)

### Earlier
- [x] Upload NFC Bridge release assets to GitHub (v1.1.0, all 5 platforms)
- [x] Escape apostrophes in JSX strings
- [x] Fix SQL parameter placeholder bug in talents.ts updateTalent function
- [x] Add multi-select talent picker for event creation form
- [x] Auto-complete events as "completed" after their date passes
- [x] Fix admin/nfc page client-side error (NFCCardRegistration.tsx was empty)
- [x] Fix NFC reader CCID protected class browser limitation (v251): WebSocket bridge, simulation mode, clearer errors
- [x] NFC Bridge server documentation, executables for all platforms, GitHub repository
- [x] Remove "VersaTalent in Action" and "Follow Our Artists" sections from homepage
