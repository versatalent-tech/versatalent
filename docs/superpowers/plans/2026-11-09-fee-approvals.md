# Fee Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A manager's change to a booking's fee, commission % or currency (and the money on a booking they create) waits as a request until an admin approves it.

**Architecture:** A `booking_fee_requests` table (one pending row per booking). The booking POST/PATCH routes take the money fields out of a manager's save and hand them to a new `fee-requests` repository. Admin routes approve (applying the values through `updateBooking`, so shares and payouts follow) or reject. The booking dialog, a Fee approvals page and a dashboard reminder show the requests.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (`sql` tagged templates), Zod, Playwright e2e (`npm run test:e2e`, `E2E_SKIP_BUILD=1` to reuse the last build).

**Spec:** `docs/superpowers/specs/2026-11-09-fee-approvals-design.md`

## Global Constraints

- Needs approval: role has `bookings.fees` and not `fees.approve` (new permission, admins only via `'*'`). Admin money changes apply directly, as now.
- Money fields: `fee_cents`, `commission_percent`, `currency`. A request stores all three as requested.
- One pending request per booking (partial unique index); a new change updates the pending row (`updated_at`), changing back to the booking's current values withdraws it.
- A manager's new booking is saved with `fee_cents` null and the talent's commission rate; a request is made only if a fee was entered or the commission differs from the talent's rate. Currency is saved on the booking as given and copied into the request.
- Statuses: `pending | approved | rejected | withdrawn` (same names as `talent_profile_changes`).
- Decided requests show on the booking for 30 days.
- Audit actions: `fee_request_approved`, `fee_request_rejected`, `fee_request_withdrawn` (entity `booking`), with old and new money.
- Migration 044 goes in `e2e/pending-migrations.txt` as `044_fee_requests.sql` until it runs on production.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Manager save that changes only money: no other field changes, no booking notification is sent to the talent, response still 200 (Task 1 test).
2. Approve clicked twice / two admins: the second gets 404 and the booking is written once (Task 2 test).
3. Request on a booking that is later deleted: cascades, and the list doesn't break (Task 2 test).
4. Manager re-saving a booking without touching money (the dialog always sends the money fields): no request is created (Task 1 test).
5. Approving a request whose booking an admin edited since: requested values win, and the list shows current vs requested (Task 2 test checks the list carries `current`).

---

### Task 1: Storage and holding managers' money changes

**Files:**
- Create: `migrations/044_fee_requests.sql` (table and indexes exactly as the spec's Storage section, `BEGIN; … COMMIT;`, header comment like `043_staff_payouts.sql`)
- Modify: `e2e/pending-migrations.txt` (add `044_fee_requests.sql`)
- Modify: `src/lib/auth/permissions.ts` (`'fees.approve'`, comment "admins only: approve managers' fee and commission changes")
- Create: `src/lib/db/repositories/fee-requests.ts`
- Modify: `src/app/api/bookings/route.ts` (POST), `src/app/api/bookings/[id]/route.ts` (PATCH)
- Modify: `src/lib/bookings/types.ts` (types below)
- Test: `e2e/tests/fee-approvals.spec.ts` (new; `test.describe('Held changes')`)

**Interfaces:**
- Produces:
  - `type FeeMoney = { fee_cents: number | null; commission_percent: number | null; currency: string }`
  - `interface FeeRequest { id: string; booking_id: string; status: 'pending' | 'approved' | 'rejected' | 'withdrawn'; fee_cents: number | null; commission_percent: number | null; currency: string; requested_by_name: string | null; created_at: string; updated_at: string; decided_at: string | null; decision_note: string | null }`
  - `requestFeeChange(bookingId: string, userId: string | null, money: FeeMoney): Promise<FeeRequest | null>`: compares with the booking's current money; equal → withdraws any pending row and returns null; otherwise inserts, or updates the pending row (`ON CONFLICT (booking_id) WHERE status = 'pending' DO UPDATE`), and returns it.
  - `needsFeeApproval(role): boolean` = `can(role, 'bookings.fees') && !can(role, 'fees.approve')`, in `src/lib/auth/permissions.ts`.
- Routes: when `needsFeeApproval(role)`:
  - POST: remove `fee_cents` and `commission_percent` from the create data (currency stays); after `createBooking`, if a fee was given or the commission differs from the talent's rate (`getTalentRate`), call `requestFeeChange` with `{ fee_cents, commission_percent: given ?? talent rate, currency }`.
  - PATCH: if any money field is in the body, build the requested money from the body falling back to the booking's current values, remove the money fields from `changes`, apply the rest as now, then `requestFeeChange`.
  - Both responses add `fee_request: FeeRequest | null` to the returned booking data and, when a request is pending, the message `'Saved. The fee change is waiting for approval.'`

Test helpers: `createTalent`, `createTeamUser('manager', [talentId])`, `teamApi`, `adminApi`; set the talent's rate with `sql\`UPDATE talents SET commission_percent = 20 …\``; create bookings as admin through `POST /api/bookings` (copy `apiBooking` from `staff-payouts.spec.ts` into this file); read requests with SQL.

- [ ] **Step 1: Write the failing tests**
  - `'a manager’s fee change is held; other fields apply'`: admin booking £1,000 at 20%; manager PATCH `{ fee_cents: 120_000, commission_percent: 25, location: 'Leeds' }` → 200, message contains "waiting for approval"; booking `fee_cents 100000`, `commission_percent 20`, `location 'Leeds'`; one `pending` row with `120000, 25, 'GBP'`.
  - `'a money-only change sends no booking notification'`: talent with a login; manager PATCH `{ fee_cents: 120_000 }` → no new `notifications` row for the talent login.
  - `'re-saving with the same money makes no request'`: manager PATCH `{ fee_cents: 100_000, commission_percent: 20, currency: 'GBP', title: 'Renamed' }` → no row.
  - `'a second change replaces the pending request; changing back withdraws it'`: PATCH fee 120,000 then 130,000 → one pending row with 130000; PATCH fee 100,000 → that row `withdrawn`, none pending.
  - `'a manager’s new booking starts with no fee and a request'`: manager POST with `fee_cents: 50_000, commission_percent: 30` → booking `fee_cents null`, `commission_percent 20` (talent rate); pending row `50000, 30`. Manager POST with no fee and commission 20 → no row.
  - `'an admin’s change applies straight away'`: admin PATCH fee 150,000 → booking 150000, no row.
- [ ] **Step 2: Run** `npm run test:e2e -- fee-approvals` → FAIL (table missing / values applied directly).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same → PASS; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat: hold managers' fee and commission changes for approval (migration 044)`

### Task 2: Approve, reject, withdraw

**Files:**
- Modify: `src/lib/db/repositories/fee-requests.ts`
- Create: `src/app/api/bookings/fee-requests/route.ts` (GET), `src/app/api/bookings/fee-requests/[id]/route.ts` (POST), `src/app/api/bookings/[id]/fee-request/route.ts` (GET, DELETE)
- Test: `e2e/tests/fee-approvals.spec.ts` (`test.describe('Deciding')`)

**Interfaces:**
- Consumes: Task 1 types and `requestFeeChange`.
- Produces:
  - `latestFeeRequest(bookingId: string): Promise<FeeRequest | null>`: the pending one, else the latest decided in the last 30 days (`withdrawn` excluded).
  - `listPendingFeeRequests(): Promise<(FeeRequest & { booking_title: string; talent_name: string; starts_at: string; current: FeeMoney })[]>` (oldest first).
  - `countPendingFeeRequests(): Promise<number>`.
  - `decideFeeRequest(id: string, actor: { userId: string | null; name: string | null }, decision: 'approve' | 'reject', note: string | null): Promise<FeeRequest | null>`: only a `pending` row; approve calls `updateBooking({ all: true, talentIds: [] }, actor, bookingId, { fee_cents, commission_percent, currency })` then marks it `approved`; reject marks `rejected`; both set `decided_by`, `decided_at`, `decision_note`. Returns null when not pending.
  - `withdrawFeeRequest(bookingId: string): Promise<boolean>`.
  - Routes: `GET /api/bookings/fee-requests` and `POST /api/bookings/fee-requests/[id]` `{ decision: 'approve' | 'reject', note?: string (≤ 500) }` → `requireTeamPermission('fees.approve')`; 404 when not pending; audit as in Global Constraints. `GET /api/bookings/[id]/fee-request` → `bookingContext('bookings.fees')`-equivalent check (the booking must be visible to the caller and the caller must have `bookings.fees`) returning `latestFeeRequest`; `DELETE` same check, withdraws, 404 when none pending.

- [ ] **Step 1: Write the failing tests**
  - `'approving applies the values and unpaid shares follow'`: manager M (rate 10%) linked to the talent; booking £1,000 at 20% (share £20); M requests £2,000; admin approves → booking 200000; `booking_staff_shares` amount via `GET /api/payouts/team?view=owed` is 4000; request `approved`.
  - `'approving twice: the second is 404'`.
  - `'rejecting leaves the booking and shows the note'`: reject with note "Too high" → booking unchanged; manager `GET /api/bookings/<id>/fee-request` returns `status 'rejected', decision_note 'Too high'`.
  - `'the list shows current and requested values'`: after an admin edits the fee to £1,100, the pending list item has `current.fee_cents 110000` and `fee_cents` = requested.
  - `'managers can’t approve, even their own'`: 403 on GET list and POST decision.
  - `'the manager can withdraw'`: DELETE → 200 and row `withdrawn`; DELETE again → 404.
  - `'deleting the booking removes its requests'`: admin DELETE booking → list doesn't contain it, no error.
- [ ] **Step 2: Run** (with build) → FAIL (404 routes).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: approve or reject managers' fee changes`

### Task 3: Screens and dashboard

**Files:**
- Create: `src/components/bookings/FeeRequestBox.tsx`
- Modify: `src/components/bookings/BookingDialog.tsx` (box above the money fields; after a save whose response has a pending `fee_request`, keep the dialog open, refresh the box and show "Saved. The fee change is waiting for approval." instead of closing)
- Create: `src/app/admin/(protected)/bookings/fee-approvals/page.tsx`
- Modify: `src/app/admin/(protected)/bookings/page.tsx` (header link "Fee approvals" when `options.can.feeApprovals`)
- Modify: `src/app/api/bookings/options/route.ts` and the `can` type in `BookingDialog.tsx` (`feeApprovals: can(role, 'fees.approve')`)
- Modify: `src/app/api/admin/dashboard/route.ts` (attention item `key: 'fee-requests'`, label `"<n> fee change(s) waiting for approval"`, detail "Managers' changes to fees or commission.", `href: '/admin/bookings/fee-approvals'`, only with `fees.approve` and n > 0)
- Test: `e2e/tests/fee-approvals.spec.ts` (`test.describe('Screens')`)

**Interfaces:**
- Consumes: Task 2 routes.
- `FeeRequestBox({ bookingId, canApprove, canWithdraw, refreshKey, onDecided })`: loads `GET /api/bookings/<id>/fee-request`; pending → "Fee change waiting for approval: £1,000 → £1,200 (20% → 25%)" plus "Requested by <name>, <date>", and Approve / Reject (with a note field) for admins or Withdraw for others; approved → "Fee change approved"; rejected → "Fee change not approved" + note. Renders nothing when null. Money shown with `formatMoney` (whole pounds), like the rest of the dialog.
- Fee approvals page copy: title "Fee approvals", intro "Managers' changes to a booking's fee or commission wait here until you approve them. Approving updates the booking, the talent's pay and the team's shares." Rows: booking title, talent, date, requested by, "Now: £1,000 · 20%" and "Requested: £1,200 · 25%", note input, Approve / Reject. Empty: "Nothing waiting."

- [ ] **Step 1: Write the failing tests**
  - `'a manager sees their change waiting in the booking dialog'`: manager changes the fee in the dialog and saves → the dialog shows "waiting for approval" and "£1,000 → £1,200".
  - `'an admin approves from the booking dialog'`: open the booking → Approve → booking fee is 120000.
  - `'an admin approves from Fee approvals'`: `/admin/bookings/fee-approvals` shows the row; Approve → row disappears; booking updated.
  - `'the dashboard counts waiting fee changes'`: `GET /api/admin/dashboard` attention has `key: 'fee-requests'` with the count in the label.
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `npx next lint` no warnings; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: Commit** `feat: fee approval screens and dashboard reminder`

### Task 4: Docs and full suite

**Files:**
- Modify: `.same/todos.md` (Check: "Fee approvals (migration 044): run the migration; as a manager change a test booking's fee, then approve it from the dashboard"; Completed; test count; date)

- [ ] **Step 1: Run** `npm run test:e2e` → all pass.
- [ ] **Step 2: Commit** `docs: fee approvals to-dos`
