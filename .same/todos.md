# VersaTalent Todos

_Last updated 15 Oct 2026. Loyalty: `docs/LOYALTY_AUDIT_AND_LAUNCH_PLAN.md`. CRM, documents, artist cards, prospecting and KPIs: `docs/CRM_PORTAL_PLAN.md`. Migrations up to 037 are on production; 038 (ticket sales) is waiting._

## 1. Decisions waiting (business owner)
Built but switched off until these are made: Founding Membership sales, rewards, referrals.
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
- [ ] Netlify has deployed `main` (latest merge `7f03205`); merges didn't always trigger builds in the past
- [ ] Talent profiles show real figures (jobs, events, clients); add earlier work in Admin → Talents → Edit → Profile figures
- [ ] Ticket sales (after migration 038): SumUp online keys set in Netlify (`SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`), add ticket types in Admin → Tickets, make one real £1 test purchase, refund it in SumUp, then press Refund in Admin → Tickets
- [ ] Tap an artist card on a phone: talent page with the Book / Save contact (/ Press kit) bar; send a test enquiry and find it in CRM → Enquiries marked "Card tap"
- [ ] Upload a comp card in Bookings → Talent documents and switch on "Public press kit"
- [ ] Talent calendars: team calendar filtered by a talent shows their events; portal Bookings page shows "Events you're in"
- [ ] Create the first prospecting campaign, add contacts, start it, work "Due today"
- [ ] Set this month's KPI targets (CRM → KPIs, target icon); check the `kpi-snapshots` scheduled function appears under Netlify → Functions

## 3. To build
- [ ] Test harness (Vitest + Neon branch): loyalty (tier boundaries, discounts, ledger `loyalty_post`, claims, refunds, referrals) and CRM (document access rules, prospecting steps and outcomes, KPI figures)
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

## 5. Housekeeping
- [ ] Clean up unused variables and imports (100 lint warnings)
- [ ] Replace `<img>` with Next.js `Image` (15 warnings)

## Completed
### October 2026
- [x] Ticket sales on the website: ticket types with limits and sale dates, buyer form (Instagram always asked), SumUp payment, points for members, refunds, door list, analysis and CSV export (migration 038)
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
