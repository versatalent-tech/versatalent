# Staff Payouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Managers and road managers earn a percentage of the agency's commission on their talents' bookings; the owner sets their rates and records payment, and each of them sees their own earnings.

**Architecture:** A `users.share_percent` rate and a `booking_staff_shares` table (one row per booking per earner, rate copied when created, paid fields like the talent payout columns). A new repository `staff-shares.ts` owns all share SQL; booking create/update call into it. New API routes mirror the talent rates and talent payout routes; the Commission Rates page, Payouts page and dashboard get the screens.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (`sql` tagged templates), Zod, Playwright e2e (`npm run test:e2e`, `E2E_SKIP_BUILD=1` to reuse the last build).

**Spec:** `docs/superpowers/specs/2026-11-09-staff-payouts-design.md`

## Global Constraints

- Share = `round(agency commission × rate / 100)`, agency commission = the existing `commissionCents(fee, commission_percent)`; same currency as the booking.
- Earners: active users with role `manager` or `road_manager`, linked in `talent_assignments`, with `share_percent` not null. Admins never earn.
- Shares are created when the booking is created and never re-rated; unpaid amounts follow later fee/commission edits; paid amounts are stored.
- Owed = booking `status IN ('confirmed','completed')`, `ends_at <= NOW()`, `fee_cents IS NOT NULL`, amount > 0, share unpaid. Independent of `talent_paid_at`.
- Permissions: team rates `rates.manage`; team payouts new `payouts.team` (admin only via `'*'`); own earnings for roles `manager`/`road_manager` only.
- The earnings response never contains fee, commission, rate, or other people's shares.
- Production SQL is run by the owner's approval only; migration 043 is listed in `e2e/pending-migrations.txt` as the bare filename `043_staff_payouts.sql` until it runs on production.
- Money is shown with the existing `formatMoney(cents, currency)`; dates in UK time (`AGENCY_TIME_ZONE`), paid dates stored as `(paid_on + 12:00) AT TIME ZONE AGENCY_TIME_ZONE` like talent payouts.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Same person linked to both the old and the new talent when a booking's talent changes, with their share already paid: the paid row is kept, no duplicate-key error (test in Task 2).
2. Deactivated earner: no share on new bookings, existing unpaid share still owed and payable (test in Task 4).
3. Rate 0% or booking with no commission %: share row exists but amount is £0 and it never shows as owed (test in Task 4).
4. Marking the same share paid twice (double click / two tabs): second call marks nothing and the stored amount doesn't change (test in Task 4).
5. Mixed currencies: owed totals are per currency, never summed across currencies (test in Task 4, dashboard attention line in Task 6).

---

### Task 1: Migration, types and the share sum

**Files:**
- Create: `migrations/043_staff_payouts.sql`
- Modify: `e2e/pending-migrations.txt` (add `043_staff_payouts.sql`)
- Modify: `src/lib/bookings/types.ts` (after `commissionCents`)
- Modify: `src/lib/auth/permissions.ts` (add `'payouts.team'` to `Permission`, comment "admins only: see and record managers' and road managers' shares")
- Test: `e2e/tests/staff-payouts.spec.ts` (new)

**Interfaces:**
- Produces:
  - `staffShareCents(feeCents: number | null, commissionPercent: number | null, sharePercent: number): number | null`
  - `type EarnerRole = 'manager' | 'road_manager'`
  - `interface TeamRate { id: string; name: string; role: EarnerRole; is_active: boolean; share_percent: number | null; talents: string[] }`
  - `interface StaffShare { booking_id: string; user_id: string; person_name: string; role: EarnerRole; booking_title: string; talent_name: string; starts_at: string; ends_at: string; currency: string; share_percent: number; amount_cents: number; paid_at: string | null; paid_cents: number | null; paid_reference: string | null }`
  - `interface MyEarning { booking_id: string; booking_title: string; talent_name: string; starts_at: string; ends_at: string; currency: string; amount_cents: number; paid_at: string | null }`
  - Table `booking_staff_shares` and column `users.share_percent` exactly as in the spec's Storage section, plus `CREATE INDEX idx_staff_shares_user ON booking_staff_shares (user_id)` and `CREATE INDEX idx_staff_shares_unpaid ON booking_staff_shares (user_id) WHERE paid_at IS NULL`. Wrapped in `BEGIN; … COMMIT;` with the header comment style of `028_talent_payouts.sql`.

- [ ] **Step 1: Write the failing test** (`test.describe('Share amounts')`, pure, no database)

```ts
test('£1,000 at 20% commission and a 10% rate is £20.00', () => {
  expect(staffShareCents(100_000, 20, 10)).toBe(2_000);
});
test('rounds to the penny from the rounded commission', () => {
  expect(staffShareCents(33_333, 15, 12.5)).toBe(625); // commission 5000, × 12.5% = 625
});
test('no fee → null; no commission % or 0% rate → 0', () => {
  expect(staffShareCents(null, 20, 10)).toBeNull();
  expect(staffShareCents(100_000, null, 10)).toBe(0);
  expect(staffShareCents(100_000, 20, 0)).toBe(0);
});
```

- [ ] **Step 2: Run** `E2E_SKIP_BUILD=1 npm run test:e2e -- staff-payouts` → FAIL (`staffShareCents` not exported). If no previous build exists, run without `E2E_SKIP_BUILD`.
- [ ] **Step 3: Implement** the types, `staffShareCents` (`Math.round(commissionCents(fee, pct)! * share / 100)`), the migration, the pending-migrations line and the permission.
- [ ] **Step 4: Run** the same command → PASS (3 tests); `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat: staff share storage and sum (migration 043)`

### Task 2: Shares created with the booking

**Files:**
- Create: `src/lib/db/repositories/staff-shares.ts`
- Modify: `src/lib/db/repositories/bookings.ts` (`createBooking` after the insert; `updateBooking` after the update)
- Test: `e2e/tests/staff-payouts.spec.ts` (`test.describe('Shares on bookings')`)

**Interfaces:**
- Consumes: Task 1 table and column.
- Produces (in `staff-shares.ts`; `@/lib/db` imports are fine here, the scheduled functions don't use it):
  - `addStaffShares(bookingId: string): Promise<void>`: inserts `(booking_id, user_id, share_percent)` for each active `manager`/`road_manager` linked to the booking's talent with `share_percent IS NOT NULL`, `ON CONFLICT (booking_id, user_id) DO NOTHING`.
  - `replaceUnpaidStaffShares(bookingId: string): Promise<void>`: `DELETE … WHERE booking_id = $1 AND paid_at IS NULL`, then `addStaffShares`.
- `createBooking` calls `addStaffShares(created.id)`; `updateBooking` calls `replaceUnpaidStaffShares(id)` only when `has('talent_id') && changes.talent_id !== current.talent_id`.

Test setup: create talents with `createTalent()`, staff with `createTeamUser(role, [talentId])`, set rates with `sql\`UPDATE users SET share_percent = … WHERE id = …\``, create and edit bookings through `adminApi()` (`POST /api/bookings`, `PATCH /api/bookings/<id>`) so the real code path runs (the `createBooking` helper in `e2e/support/db.ts` inserts directly and must not be used here). Read shares with `sql\`SELECT user_id, share_percent, paid_at FROM booking_staff_shares WHERE booking_id = …\``. Add a helper `apiBooking(api, talentId, overrides)` in the spec file that posts a finished, confirmed £1,000 booking at 20% (`fee_cents: 100_000, commission_percent: 20, status: 'confirmed'`, start 3 days ago).

- [ ] **Step 1: Write the failing tests**
  - `'a booking gets a share for each rated person linked to the talent'`: manager at 10%, road manager at 5%, a third linked manager with no rate → two rows, percents `[10, 5]` by user.
  - `'a rate change later leaves the booking alone; a new booking uses the new rate'`: rate 10 → booking A → rate 15 → booking B → A row 10, B row 15.
  - `'deactivated and admin users get no share'`: linked manager with a rate but `is_active = false` → no row.
  - `'changing the talent moves unpaid shares and keeps paid ones'`: talent X with manager M1 (10%) and road manager R (5%), talent Y with M1 and manager M2 (8%); mark R's share paid with SQL (`paid_at = NOW(), paid_cents = 100`); PATCH `talent_id` to Y → rows: R (paid, kept), M1 (10, unpaid, no error), M2 (8).
  - `'deleting a booking removes its shares'`: DELETE `/api/bookings/<id>` → no rows.
- [ ] **Step 2: Run** `npm run test:e2e -- staff-payouts` (with a build: app code changed) → the new tests FAIL (no rows).
- [ ] **Step 3: Implement** `staff-shares.ts` and the two calls.
- [ ] **Step 4: Run** the same → PASS.
- [ ] **Step 5: Commit** `feat: bookings create staff shares for their talents' managers`

### Task 3: Team rates

**Files:**
- Modify: `src/lib/db/repositories/staff-shares.ts`
- Modify: `src/lib/bookings/schemas.ts` (next to `ratesSchema`)
- Create: `src/app/api/team-rates/route.ts`
- Test: `e2e/tests/staff-payouts.spec.ts` (`test.describe('Team rates')`)

**Interfaces:**
- Consumes: `TeamRate` (Task 1), `addStaffShares` (Task 2).
- Produces:
  - `teamRatesSchema = z.object({ rates: z.array(z.object({ user_id: uuid, share_percent: percent.nullable() })).max(200) })`
  - `listTeamRates(): Promise<{ people: TeamRate[]; overLimit: { talent: string; percent: number }[] }>`: all `manager`/`road_manager` users (active first, then name), each with their linked talents' names; `overLimit` lists talents whose active linked people's rates add up to more than 100.
  - `setTeamRates(rates: { user_id: string; share_percent: number | null }[]): Promise<string[]>`: updates only users whose role is `manager`/`road_manager`; returns ids whose rate went from null to a number, and for those inserts shares on their linked talents' bookings where `status <> 'cancelled' AND talent_paid_at IS NULL` (`ON CONFLICT DO NOTHING`), at the new rate.
  - `GET /api/team-rates` → `listTeamRates()`; `PUT /api/team-rates` with `teamRatesSchema` → sets, `logAudit(actor, 'team_rates_changed', 'user', <id>, { before, after })` per changed person (same pattern as `src/app/api/talent-rates/route.ts`), returns `listTeamRates()`. Both `requireTeamPermission('rates.manage')`.

- [ ] **Step 1: Write the failing tests**
  - `'first rate fills in unpaid, uncancelled bookings only'`: manager linked to talent T with no rate; bookings via `apiBooking`: finished unpaid, upcoming (`starts in 5 days`), cancelled, and one with `talent_paid_at` set by SQL. PUT rate 10 → shares exist on the first two only, at 10.
  - `'changing a rate later adds nothing and changes nothing'`: after the above, add another booking for T by direct SQL insert (no share), PUT rate 12 → existing shares still 10, the direct-insert booking still has none.
  - `'over 100% is reported'`: two people on one talent at 60 and 50 → `overLimit` contains `{ talent: <name>, percent: 110 }`.
  - `'managers can’t see or set team rates'`: `teamApi(manager)` GET and PUT → 403.
- [ ] **Step 2: Run** (with build) → FAIL (404 on `/api/team-rates`).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: team commission rates with first-rate backfill`

### Task 4: Team payouts

**Files:**
- Modify: `src/lib/db/repositories/staff-shares.ts`
- Create: `src/app/api/payouts/team/route.ts`, `src/app/api/payouts/team/paid/route.ts`, `src/app/api/payouts/team/[bookingId]/[userId]/route.ts`
- Test: `e2e/tests/staff-payouts.spec.ts` (`test.describe('Team payouts')`)

**Interfaces:**
- Consumes: `StaffShare` (Task 1).
- Produces:
  - SQL amount expression, used everywhere: `ROUND(ROUND(b.fee_cents * COALESCE(b.commission_percent, 0) / 100) * s.share_percent / 100)::int`.
  - `listOwedStaffShares(): Promise<StaffShare[]>` (owed rule from Global Constraints; ordered person name, then `starts_at`; limit 1000).
  - `listRecentStaffShares(days = 120): Promise<StaffShare[]>` (`paid_at > NOW() - days`, newest first; limit 500).
  - `markStaffSharesPaid(actor: BookingActor, shares: { booking_id: string; user_id: string }[], paidOn: string, reference: string | null): Promise<StaffShare[]>`: updates only owed rows; `paid_cents` = the amount at that moment.
  - `clearStaffShare(bookingId: string, userId: string): Promise<boolean>`.
  - `summariseOwedStaffShares(): Promise<{ count: number; totals: { currency: string; cents: number }[] }>` (for Task 6).
  - Routes, all `requireTeamPermission('payouts.team')`: `GET /api/payouts/team?view=owed|paid`; `POST /api/payouts/team/paid` with `{ shares: [{ booking_id, user_id }] (1–200), paid_on: 'YYYY-MM-DD', reference? }` (same validation and "can’t be in the future" rule as `src/app/api/payouts/paid/route.ts`, audit `staff_share_paid` per share), response message `"<n> marked paid"`; `DELETE /api/payouts/team/<bookingId>/<userId>` (audit `staff_share_cleared`; 404 when nothing to clear).

- [ ] **Step 1: Write the failing tests**
  - `'owed lists finished shares with an amount'`: owed contains the £20.00 share (`amount_cents: 2000`); not the upcoming booking's share, not a cancelled one, not a booking with `fee_cents` null, not a 0% share, not a booking with `commission_percent` null.
  - `'mixed currencies stay separate'`: a GBP and an EUR booking for the same person → `GET /api/payouts/team` rows carry `currency` `'GBP'` and `'EUR'` with their own amounts (the per-currency dashboard total is tested in Task 6).
  - `'marking paid stores the amount; marking again changes nothing'`: POST paid → row `paid_cents 2000`, reference saved; PATCH the booking fee to £2,000; POST paid again → response marks 0, `paid_cents` still 2000; the share appears in `view=paid`.
  - `'an unfinished booking’s share can’t be marked paid'`: upcoming booking's share → 0 marked.
  - `'undo clears the payment'`: DELETE → owed again; DELETE again → 404.
  - `'a deactivated person’s share is still owed and payable'`.
  - `'managers can’t see or pay team shares'`: manager GET/POST/DELETE → 403 (including their own share).
- [ ] **Step 2: Run** (with build) → FAIL (404s).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: record payment of managers' and road managers' shares`

### Task 5: Your earnings (API)

**Files:**
- Modify: `src/lib/db/repositories/staff-shares.ts`
- Create: `src/app/api/earnings/mine/route.ts`
- Test: `e2e/tests/staff-payouts.spec.ts` (`test.describe('Your earnings')`)

**Interfaces:**
- Consumes: `MyEarning` (Task 1), amount expression (Task 4).
- Produces:
  - `listMyEarnings(userId: string): Promise<{ owed: MyEarning[]; paid: MyEarning[]; upcoming: MyEarning[] }>`: owed by the owed rule; paid within 120 days (`amount_cents` = `paid_cents`); upcoming = unpaid, not cancelled, amount > 0, booking not yet finished. Selects only the `MyEarning` fields.
  - `GET /api/earnings/mine`: `requireTeamPermission('dashboard.view')`, then 403 unless `session.role` is `manager` or `road_manager`; returns `listMyEarnings(session.userId)`.

- [ ] **Step 1: Write the failing tests**
  - `'each person sees only their own shares'`: two people on one talent → each response's `owed` has one row with their own amount (`2000` vs `1000`).
  - `'no fee, commission or rate in the response'`: `JSON.stringify(body)` doesn't contain `fee`, `commission`, `share_percent`, or the other person's name.
  - `'paid and upcoming are listed'`.
  - `'admins get 403'` (adminApi).
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: managers and road managers can see their own earnings`

### Task 6: Screens and dashboard

**Files:**
- Modify: `src/app/admin/(protected)/bookings/rates/page.tsx` (Team section)
- Modify: `src/app/admin/(protected)/bookings/payouts/page.tsx` (Talents | Team tabs)
- Create: `src/components/bookings/TeamPayouts.tsx` (the Team tab body, same structure as the talent list: grouped by person, tick, "Mark paid" dialog with date + reference, undo, Owed / Recently paid)
- Create: `src/components/dashboard/MyEarningsCard.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (render `MyEarningsCard` when `viewer.role` is `manager` or `road_manager`)
- Modify: `src/app/api/admin/dashboard/route.ts` (attention item `key: 'team-pay-owed'` when `can(role, 'payouts.team')` and count > 0: label `"<n finished job(s)> not paid to the team yet"`, detail totals per currency joined with " + ", `href: '/admin/bookings/payouts?tab=team'`)
- Modify: `src/app/api/bookings/options/route.ts` (`can.teamPayouts: can(role, 'payouts.team')`)
- Test: `e2e/tests/staff-payouts.spec.ts` (`test.describe('Screens')`)

**Interfaces:**
- Consumes: `/api/team-rates` (Task 3), `/api/payouts/team*` (Task 4), `/api/earnings/mine` (Task 5), `summariseOwedStaffShares` (Task 4).
- Copy (exact): rates section heading "Team"; intro "A share of the agency's commission on each booking for the talents they look after. New bookings take the current rate; existing bookings keep theirs."; each row shows name, role label ("Manager" / "Road manager") and linked talents in grey; save button "Save team rates"; warning "<talent>: the people looking after them add up to <n>% of the commission." Payouts tabs "Talents" and "Team" (Team only when `can.teamPayouts`; `?tab=team` opens it). Dashboard card title "Your earnings": "To be paid" total per currency and list (booking title, talent, date, amount), "Coming up" count and total, "Paid recently" list; empty state "Nothing yet. Your share of your talents' bookings will show here."

- [ ] **Step 1: Write the failing tests** (pages, using a browser context from `await (await teamApi(email, password)).storageState()` for team users, `ADMIN_STATE` for admin)
  - `'admin pays a team share from the Team tab'`: open `/admin/bookings/payouts?tab=team`, the person's name and "£20.00" are visible; tick it, "Mark paid", confirm → it leaves the owed list.
  - `'managers don’t see the Team tab'`: manager on `/admin/bookings/payouts` → no "Team" tab.
  - `'a road manager sees their earnings on the dashboard'`: `/admin` shows "Your earnings" and their amount, and no fee figure for the booking.
  - `'admin dashboard flags team pay owed'`: with a GBP and an EUR share owed, `GET /api/admin/dashboard` attention has `key: 'team-pay-owed'` whose detail lists both amounts separately.
  - `'team rates can be set on the rates page'`: admin types 10 for a person, "Save team rates" → `users.share_percent` is 10.
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `npx next lint` reports no warnings; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat: team rates, team payouts and earnings screens`

### Task 7: Docs and full suite

**Files:**
- Modify: `.same/todos.md` (Check: "Team payouts (migration 043): run the migration, set each manager's and road manager's rate on Bookings → Commission Rates, check the shares on their talents' bookings, pay one from Payouts → Team, and check their dashboard"; Completed; test count; last updated date)
- Modify: `src/app/privacy/page.tsx` only if it describes what's stored about team members' pay (check; otherwise no change)

- [ ] **Step 1: Run the whole suite** `npm run test:e2e` → all pass (94 existing + the new ones).
- [ ] **Step 2: Commit** `docs: team payouts to-dos`
