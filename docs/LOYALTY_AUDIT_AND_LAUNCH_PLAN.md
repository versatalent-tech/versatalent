# VersaTalent NFC VIP: Audit and Launch Plan

_Prepared 9 October 2026 (corrected the same day: see §2a) in response to the strategist's brief "VersaTalent NFC VIP: Technical Audit, Product Specification & 30-Day Implementation Brief". Findings come from reading the code in this repository and querying the production database (read-only), not from reported functionality._

## 1. Summary

- **The core is sound and reusable:**
  - NFC cards
  - staff check-in with once-per-event points
  - till payments with server-side tier discounts
  - points awarded exactly once per paid order
  - configurable tiers, thresholds, discounts and multipliers
  - anniversary-year requalification
- **Missing:**
  - public sign-up
  - paid membership
  - reward redemption (no code exists, despite being reported as a "full workflow")
  - separate status and reward ledgers
  - refunds
  - referrals
  - automated messaging (no email provider)
  - loyalty reporting
- **Migrating to two ledgers is easy now.** There are 5 memberships holding **10 points in total**, and 14 points-log entries, mostly test adjustments. Starting reward balances at a launch date is fair and needs no complex conversion.
- **Recommended route:**
  1. Launch the free programme with an online application form and posted cards first (**Stage 1, about 1 week**).
  2. Then the £29.99 Founding Membership through the existing SumUp account (**Stage 2**).
  3. Then dual ledgers and the three rewards (**Stage 3**).
  4. Retention emails and referrals last (**Stage 4**). They need an email provider and a domain of your own.

## 2. Component audit

Status key: ✅ Verified (code inspected, behaviour confirmed) · 🟡 Partially verified · ❌ Missing · ⚠️ Unsafe for launch as-is.

| Component | Status | Evidence | Notes |
|---|---|---|---|
| Website and backend | ✅ | Next.js 15 on Netlify; Neon Postgres 17; route handlers in `src/app/api/*`; repositories in `src/lib/db/repositories/*` | Deployed from `main`. Production builds were not triggering on merges (fixed by a push on 8 Oct; worth checking Netlify's GitHub link). |
| Authentication and roles | ✅ | HMAC-signed session cookies (`lib/auth/session.ts`); roles admin, manager, road_manager, staff, artist; permission map `lib/auth/permissions.ts` | Login throttling and `audit_log` added 8 Oct. VIP members have **no login** (card-tap page only). |
| NFC cards | ✅ | `nfc_cards` (2 VIP, 4 artist, all active); statuses active, inactive, blocked; `WriteCardUrl` writes the card's URL | Blocked or inactive cards are refused at check-in (`api/nfc/checkins`, `api/staff/event-day/[eventId]/checkin`). |
| Desktop NFC Bridge | 🟡 | Separate repo `nfc-bridge-server` v1.1.0; the site connects to `ws://localhost:9876` (`useBridgeCardTaps`) | Code exists. Reconnection, rapid taps and restarts need testing on the venue laptop and reader (brief §5.2). |
| Card tap vs attendance | ⚠️ → fixed in #35 | **Corrected.** The card-tap *page* `app/nfc/[card_uid]` posts to `api/nfc/checkins`, which created a check-in and awarded the daily check-in points with no staff involved | Anyone holding a card (or its URL) could earn that member's points. Fixed in PR #35: taps are logged in `nfc_scan_logs` only. |
| Event check-in points | ✅ | `processEventCheckin`: an atomic `vip_checkin_awards (user_id, award_key)` claim means once per event per UK day | Rule: `event_checkin` = 5 points × tier multiplier. |
| Till transactions | ✅ | `completeOrderPayment` marks the order paid once (`markOrderPaid` transition), then awards points once; SumUp reader, SumUp app and cash | Points = 1 per £3 paid (after discount) × tier multiplier. |
| Tier discounts | ✅ | Calculated server-side in `api/pos/orders` ("never taken from the till"); per-product `member_discount_excluded`; order stores `discount_cents`, `discount_percent`, `discount_tier` | **Black is currently 20%.** Set `tier_discount_black` to 10 in VIP → Point Rules (no code change). |
| Silver/Gold/Black progression | ✅ | `lib/vip-tier-rules.ts` (pure, testable): thresholds 500 / 1,750, anniversary year, "never more than one tier below" soft landing; settings in `vip_point_rules` | Matches the brief. Needs boundary tests written (QA-01/02/09). |
| Single vs separate ledgers | ⚠️ (worse than first reported) | `vip_memberships` has `points_balance`, `lifetime_points` and `status_points`, but **one delta updates all three** (`addPointsToMembership`); one log, `vip_points_log` | Status is tracked separately by year, but a negative adjustment also reduces status. **Also: none of the 5 members' balances equal the sum of their log entries**, because the admin "edit membership" route can overwrite `points_balance` with no log entry, and awards aren't one transaction. Must be rebuilt before rewards launch (QA-03, QA-21). |
| Reward redemption | ❌ | No redemption tables, routes or UI. `vip_tier_benefits` are descriptive text only | Reported as existing; it isn't. Build in Stage 3. |
| Refunds and voids | ❌ | `pos_orders.status`: pending, paid, cancelled, failed; no refund state. A paid order can be set to cancelled (stock is restored) but its points and consumption record stay | QA-08 would fail. Add a refund flow that reverses points (Stage 3). |
| Manual adjustments | 🟡 | `api/vip/points/adjust`: admin-only, reason required, logged in `vip_points_log` with `adjusted_by` | Not yet in `audit_log`; can push status below the year's earned level. |
| Member profiles and consent | 🟡 | `vip_profiles`: phone, age range, address, interests, referral source, `consent_email`/`sms`/`post` with timestamp | Table exists but **0 rows**; captured by the sign-up form in #35. Member data endpoints (`api/vip/memberships/[user_id]`, `api/vip/points-log?user_id=`, `api/nfc/checkins?user_id=`) are public, protected only by the unguessable member ID. |
| Paid membership | ❌ | No product, entitlement or online checkout. SumUp is configured for the till (API key + merchant code) | SumUp's Checkouts API supports a hosted online payment page with the same account, so no new provider is needed. |
| Automated retention | ❌ | No email/SMS provider, scheduler or templates | Needs an email provider and an owned sending domain (see roadmap §14). |
| Referrals | ❌ | No codes, attribution or rewards (`referral_source` is a free-text profile field) | Stage 4. |
| Admin controls | 🟡 | VIP admin: point rules, tier benefits, memberships, consumption tracker; Team roles; audit log for team/CRM/bookings | Missing: rewards, claims, paid memberships, campaign switches, kill switches. |
| Reporting | 🟡 | Admin dashboard: till revenue per currency, VIP counts by tier, check-ins | No loyalty or reward-liability reports, and no reconciliation. |
| Backups | ⚠️ | Neon project `history_retention_seconds = 21600` (**6 hours** point-in-time restore) | Too short for a financial ledger. Raise retention (plan permitting) or schedule daily snapshots before launch. |

## 2a. Corrections (9 October 2026)

A second, independent audit of the same brief (`docs/LOYALTY_AUDIT.md`, not written by me) found two things this audit missed. I checked both against the code and production data, and both are correct:

1. **Card taps earned points.** I had checked only the API route `api/nfc/[card_uid]`, not the page that calls it. Now fixed in #35.
2. **Balances don't reconcile with the points log** for any of the 5 members. Stage 3 already plans a new ledger; this makes it a requirement rather than an improvement.

Neither changes the staged plan below. #1 is fixed as part of Stage 1.

## 3. Proposed stages

### Stage 1: Sign-ups open (buildable now, about 1 week)

The goal is for people to join online today, with their card posted home.

- **Public page `/membership`:**
  - explains the free programme, the Silver / Gold / Black tiers and what each gives (taken from the existing VIP tier benefits);
  - previews the Founding Membership with a "Register interest" option (not on sale yet).
- **Application form:**
  - name, email, mobile;
  - date of birth with an **18+ confirmation** (drink rewards are planned);
  - postal address (line 1/2, city, postcode, country): needed to post the card;
  - interests and "how did you hear about us";
  - **separate, unticked** consents for email, SMS and post (UK GDPR/PECR), stored with a timestamp;
  - acceptance of the programme terms and privacy notice (links to pages you approve).
- **Protections:** a spam trap, a rate limit, and duplicate-email detection that never tells anyone whether an email is already registered.
- **What happens on submit:** a member account is created (role `vip`, Silver, 0 points) with its profile, plus a **card request** in a fulfilment queue.
- **Admin "Card requests" queue:**
  1. New
  2. Card assigned: pick or tap an unused card; the existing "write card URL" step is reused
  3. Posted: date
  4. Activated: first tap or check-in
  - Also: print the address label, and cancel or reject requests.
- **Dashboard alert:** "N cards to post".
- **No email yet:** confirmation is on-screen ("we'll post your card to …"). When an email provider is set up later, the welcome email plugs in.

### Stage 2: Founding Membership £29.99

- **Payment:** SumUp hosted checkout using your existing account. Payment is confirmed on the server (webhook plus a status check), and the confirmation can be processed repeatedly without creating duplicate memberships.
- **Records:** a `paid_memberships` table holding the full lifecycle: pending, active, payment failed, cancelled, expired, refunded. Each record has start and end dates and the SumUp transaction reference. Card details never reach our database.
- **One-year term, no auto-renewal,** so nothing renews by assumption. A renewal reminder is added once email is set up.
- **Separate from tiers:** it never changes a member's tier or points.
- **Admin:** see active members, expiry dates and a reconciliation of SumUp payments against memberships, with a switch to pause sales.
- **Before it goes on sale, you need to define:** the benefits, each benefit's capacity or cost, and the membership terms.

### Stage 3: Two ledgers and the first three rewards

- **Two balances:** status points (drive tier) and reward points (spendable), each with its own transaction history. The ledger type is set on every entry, updates are atomic, and every earn has a unique source key, so duplicates are impossible.
- **Starting balances:** status stays as is; reward balances start at **0 on launch day**. Optionally, credit the 10 existing points as a goodwill opening balance.
- **Earning rules are configurable per ledger** (check-in, spend, multiplier) and need your approval after modelling.
- **Rewards:** selected drink, ticket upgrade and guest pass, each with point cost, stock or caps, validity and eligible events.
- **Claims:** reserved → redeemed / cancelled / expired, with points held and released atomically. Each claim has a unique code that staff check at the door or till. A used guest pass is rejected.
- **Refunds and voids at the till** reverse the points.
- **Reports:** claims, redemption rate, direct cost and outstanding liability.
- **Black discount** reduced to 10%, a settings change.

### Stage 4: Retention and referrals (needs an email provider and an owned domain)

- **Retention:** welcome, post-event follow-up, inactivity and "approaching the next tier" messages. Each has consent checks, deduplication, cooldowns and an on/off switch.
- **Referrals:** a unique code per member, attribution at sign-up, and approval only after a qualifying action (for example a first verified paid attendance). Self-referral, duplicate-account and per-member caps are blocked, and the reward goes to reward points only.

## 4. Decisions needed from the business

1. **Programme terms and privacy notice** for the sign-up form: who writes them? I can draft plain-English versions for review.
2. **Minimum age:** 18+ for everyone, or only for drink rewards?
3. **Card fulfilment:** who posts cards, and how quickly (for example within 5 working days)? Are cards free to the member?
4. **Founding Membership benefits:** what exactly members get, with each benefit's capacity and cost. Is it one year from purchase or a fixed season?
5. **Earning rules per ledger** (Stage 3): do check-ins and spend earn both status and reward points, or only some?
6. **Opening reward balances:** start at 0, or credit current balances (10 points across all members)?
7. **Backups:** increase Neon's restore window or set up scheduled snapshots (check the plan's cost).

## 5. Effort (revised)

| Stage | Size | Depends on |
|---|---|---|
| 1. Sign-ups and card fulfilment | S–M (about 1 week) | Decisions 1–3 (I can draft the terms) |
| 2. Founding Membership | M | Decision 4; SumUp online payments enabled on the account |
| 3. Two ledgers and rewards | L | Decisions 5–6; reward costs approved |
| 4. Retention and referrals | M–L | Email provider and domain; consent wording |

The 30-day target is achievable for Stages 1–3 if the decisions arrive in the first week. Stage 4 depends on the email setup.
