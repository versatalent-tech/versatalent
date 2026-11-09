# VersaTalent Todos

_Last updated 9 Nov 2026. Loyalty: `docs/LOYALTY_AUDIT_AND_LAUNCH_PLAN.md`. CRM, documents, artist cards, prospecting and KPIs: `docs/CRM_PORTAL_PLAN.md`. Ticket sales: Admin → Tickets. All migrations up to 043 are on production. Tests: `npm run test:e2e` (149 tests, also run on GitHub for every PR)._

## 1. Decisions waiting (business owner)
Built but switched off until these are made: Founding Membership sales, rewards, referrals. Ticket sales are built and live, but nothing is on sale until ticket types are added.
- [ ] Programme terms and privacy notice approved (drafts at `/membership/terms`; updated 4 Nov with card replacement fees, posting in 7 to 14 working days and 20 points per check-in)
- [ ] Earning rules per ledger (reward share of each award, default 100%)
- [ ] Reward point costs (current values are placeholders), stock and limits. A check-in (20 points since 4 Nov) is worth as much as £40 at the bar. Gold now takes 10 check-ins a year (200 points) and Black about 33 (650): check the tier levels still feel right
- [ ] Points expiry: how many months with nothing earned or spent (Admin → Rewards; off until set). Nothing expires before rewards open, and the clock starts on launch day
- [ ] Rewards launch: when to open them (Admin → Rewards → switch on). Until then they're hidden from members while reward points build up (110 across 5 members on 4 Nov)
- [ ] Opening reward balances: keep the points built up before launch, or start everyone at 0 on launch day
- [ ] Confirm the open figures in the benefit sheet (VAT, card fee, drink cost, card price, guest-pass cost, members' night cost, presale support)
- [ ] Ticket terms approved (draft at `/tickets/terms`), and the ticket lines added to the privacy notice
- [ ] Ticket points rate (VIP → Point Rules → Ticket Points; 1 point per £3, while the till gives 1 per £2). Recommended: no extra bonus for buying on the website; buyers already earn twice (buying and checking in), and a temporary double-points launch offer can be tried later
- [ ] Email provider and owned domain: unlocks automatic member emails, ticket confirmation emails and prospecting v2

## 2. Check after the latest deploys
- [ ] Fee approvals (migration 044 not yet on production): run the migration; as a manager, change a test booking's fee, then approve it from the dashboard reminder or Bookings → Fee approvals
- [ ] Team payouts (migration 043 on production 9 Nov 2026): set each manager's and road manager's rate on Bookings → Commission Rates (Team), check the shares on their talents' bookings, pay one from Payouts → Team, and check "Your earnings" on their dashboard
- [ ] Talent notifications (migration 042 on production 8 Nov 2026): add the push keys in Netlify (`docs/NOTIFICATIONS_SETUP.md`) and redeploy. Check the bell in the portal, switch on notifications on an Android phone and an iPhone (from the Home Screen), give a test to-do and change a test booking
- [ ] Phone tap on an Android phone or tablet with NFC (Chrome): open Staff → Event day and Staff → Rewards, press "Tap cards on this device", allow NFC, then hold a member card to the back of the device. iPhones and iPads can't read cards from a website, so use an Android device or a laptop with the USB reader
- [ ] After rewards launch: ask for a reward on a test member's pass (no points taken), then tap the card at Staff → Rewards and "Confirm and give" (points taken then)
- [ ] Member pass with rewards closed: no reward points balance or rewards list; "Points this year" still shows. Admin → Rewards says points are building up for launch
- [ ] Tickets with a membership card: tap a VIP card on a phone; the pass always shows "Buy tickets with your card" (with "No tickets on sale right now" until ticket types are added); the ticket page says "Points go to <first name>"; buy with a different email and check the points reach the card's member; "Not you?" removes the link
- [ ] Public member pass: shows the first name, tier, points and benefits only; points history, check-ins and the email appear only when signed in as the team. Check in a private tab or on a phone never signed in to the admin (on 5 Nov the history showed because the phone was signed in as the team)
- [ ] Instagram posts (phase 1): migration 039 is on production (28 Oct 2026). Admin → Instagram should list the 5 carried-over posts (Deejay WG ×2, Jessica Dias ×2, João Rodolfo ×1); add Antonio Monteiro's and others' posts there, and check the homepage section and a talent profile
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
- [ ] Instagram phase 2: migration 040 is on production (29 Oct 2026). Set up the Meta app and Netlify variables (`docs/INSTAGRAM_SETUP.md`), connect @versatalent in Admin → Instagram, and ask each talent to connect from their portal
- [ ] Instagram phase 3: insights page (engagement by talent, format, content tags, posting time)
- [ ] More tests (Playwright, `e2e/tests`): loyalty at the till (tier boundaries, discounts, till refunds), referrals; CRM (document access rules, prospecting steps and outcomes, KPI figures); bookings and talent calendars; booking documents; staff and guest card taps

## 4. Later
- [ ] Notifications follow-ups from the review: switch off phone notifications when a talent signs out; tell talents when a cancelled booking is back on or a booking is un-shared; mark only the shown notifications read; re-subscribe phones after the push keys change; limit phones per talent
- [ ] AI meeting notes (built, off): privacy notice line about Anthropic, add `ANTHROPIC_API_KEY` in Netlify (Functions scope), redeploy, test one draft
- [ ] Meetings: audio recordings (needs a speech-to-text service), link meetings to bookings, share notes with talents
- [ ] Prospecting v2: send through an email provider, open/reply tracking, one-click unsubscribe
- [ ] KPIs: targets per person or per talent; outstanding invoices once invoicing exists
- [ ] Artist card: choose which profile sections each card shows (e.g. measurements)
- [ ] Artist card: tap and enquiry counts per talent, shown in their portal
- [ ] Artist card: "Recently performed at / next appearance" on the profile
- [ ] Tickets: confirmation email with the order link (needs the email provider)
- [ ] Member accounts (plan in `docs/CRM_PORTAL_PLAN.md` §19): members sign in by email link to see their own points history and check-ins again (needs the email provider)
- [ ] Tickets: scan a QR code at the door instead of the name list; per-event age limit (18+) on the form
- [ ] Tickets: discount codes, member presale (48-hour early access benefit) and member-only ticket types
- [ ] Tickets: link ticket buyers to CRM contacts / newsletter when they agree to marketing
- [ ] Notifications by email, for talents who don't switch on phone notifications (needs the email provider); notifications for road managers and the team
- [ ] Talent portal logins switched off for Claudio Costa and Joao Rodolfo: switch them on if they should get tasks or see bookings
- [ ] Card payments: Solo Lite works through the SumUp app (till → "SumUp app" + transaction code); a SumUp Solo would let the till send amounts straight to the reader

- [ ] Sign the macOS NFC Bridge app so staff don't get a security warning: needs an Apple Developer Program membership (not yet, decided 5 Nov). Until then, staff open it the first time with right-click → Open → Open. Android phones and tablets don't need the Bridge (phone tap)
- [ ] Backups: a longer Neon restore window needs a paid Neon plan (the free plan's 6 hours is already set); staying on free for now

## Completed
### November 2026
- [x] Fee approvals: managers' changes to a booking's fee, commission or currency (and the fee on bookings they create) wait for an admin's approval (migration 044)
- [x] Tasks on their own: CRM → Tasks → New task, for anyone (team, road managers, talents with a portal login), optionally linked to a client or deal
- [x] Team payouts: managers and road managers earn a share of the agency's commission on their talents' bookings; rates, Payouts → Team, and "Your earnings" on their dashboard (migration 043)
- [x] Housekeeping: no lint warnings left (unused code removed, admin images use Next.js `Image`); the talent compare bars now show the real proportions
- [x] Talent notifications: portal bell, phone push, reminders the day before (migration 042)
- [x] Member pass always shows "Buy tickets with your card", with a note while nothing is on sale (PR #61)
- [x] Checked on 5 Nov: the public pass hides points history, check-ins and the email from anyone not signed in as the team
- [x] Door check-in and staff Rewards read cards on Android phones and tablets (Chrome's NFC), as the till already did; no Bridge or computer needed (PR #61)
- [x] Decided: minimum age 18+ for everyone; cards posted within 7 to 14 working days; replacement cards may be charged (new card, set-up and postage)
- [x] Check-in points 50 → 20 (VIP → Point Rules, 4 Nov)
- [x] Netlify deployed `main` up to `7a250cd` (checked 4 Nov)
- [x] Rewards need staff and the card: members ask on their pass (no points taken), staff tap the card and confirm, and the points are taken then; claim codes are no longer shown on the pass (migration 041)
- [x] Reward points expiry (off until a number of months is set); nothing expires while rewards are closed, and everyone gets the full period from launch
- [x] Reward points build up in the background while rewards are hidden
- [x] Tickets bought from a membership card earn that member's points, whichever email is used; the pass lists events on sale; the form never fills in the member's details
- [x] Public member pass shows less: first name only, no points history or check-ins for anyone outside the team

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
