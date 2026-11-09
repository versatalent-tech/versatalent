# Fee and commission approvals: design

_9 Nov 2026. Approved in conversation: a manager's fee or commission change is held as a request until the owner approves it; new bookings too; approved from the dashboard (list page) and on the booking._

## Goal

Managers now earn a share of the agency's commission on their talents' bookings, so a manager changing a booking's fee or commission changes their own pay. Those changes wait for the owner's approval instead of applying straight away.

**Who needs approval:** anyone who can edit fees (`bookings.fees`) but can't approve them. A new permission `fees.approve` is admins only; today that means managers need approval and admins don't. Road managers can't see or change fees at all, as now.

**What counts as a money change:** `fee_cents`, `commission_percent` and `currency` on a booking. Nothing else on the booking needs approval.

**Out of this version:** notifications to the manager (team members have no notifications yet; they see the outcome on the booking), approval of other booking fields.

## Behaviour

**A manager edits a booking's money.** Every other field in the same save applies as now. The money fields keep their current values, and a request is saved with the requested fee, commission % and currency (all three, so approving sets exactly what was asked). The response says "Saved. The fee change is waiting for approval."
- If the requested values equal the booking's current values, no request is made, and a waiting request on that booking is withdrawn (the manager changed their mind).
- A booking has at most one waiting request; a new change replaces the waiting one's values (same row, updated time).

**A manager creates a booking with a fee or commission.** The booking is saved with no fee (`fee_cents` null), the talent's current commission %, and the currency given. If they entered a fee or a commission different from the talent's rate, a request is saved with those values. Until it's approved the booking shows "No fee set", so nothing is owed on it and staff shares are £0.

**The manager withdraws.** They can withdraw a waiting request on a booking they can see (`DELETE`), which marks it `withdrawn`.

**The owner approves.** The requested values are written to the booking through the normal update path (`updateBooking`), so everything that depends on the fee follows: unpaid talent net, unpaid staff shares, payout lists. Amounts already paid don't change. The request is marked `approved` with who and when. Approving applies the requested values even if the booking's money was changed by an admin since; the list always shows the booking's current values next to the requested ones.

**The owner rejects.** The booking is unchanged; the request is marked `rejected` with an optional note.

**What the manager sees afterwards.** The booking shows the latest decision for 30 days: "Fee change approved" or "Fee change not approved: <note>". A waiting request shows as "Fee change waiting for approval: £1,000 → £1,200 (20% → 25%)".

**Audit.** Approve, reject and withdraw are written to the audit log with the booking id, old and new values.

## Storage (migration 044)

```sql
booking_fee_requests (
  id uuid PK DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL → bookings ON DELETE CASCADE,
  requested_by uuid → users ON DELETE SET NULL,
  fee_cents integer (>= 0, nullable),
  commission_percent numeric(5,2) (0–100, nullable),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  decided_by uuid → users ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- at most one pending request per booking
CREATE UNIQUE INDEX … (booking_id) WHERE status = 'pending';
CREATE INDEX … (status, created_at DESC);
```

Same shape and status names as `talent_profile_changes` (027).

## Code

- `src/lib/auth/permissions.ts`: `'fees.approve'` (admins only).
- `src/lib/db/repositories/fee-requests.ts`: `requestFeeChange(bookingId, userId, money)` (insert or update the pending row; withdraw it when `money` equals the booking's current values), `listPendingFeeRequests()`, `latestFeeRequest(bookingId)` (pending, or decided in the last 30 days), `decideFeeRequest(id, actor, 'approve' | 'reject', note)`, `withdrawFeeRequest(bookingId, userId)`, `countPendingFeeRequests()`.
- `POST /api/bookings` and `PATCH /api/bookings/[id]`: when the person has `bookings.fees` but not `fees.approve`, money fields are taken out of the save and passed to `requestFeeChange`.
- `GET /api/bookings/[id]` (and the booking in calendar data where the dialog reads it) includes `fee_request` for people who can see fees: `{ id, status, fee_cents, commission_percent, currency, requested_by_name, created_at, decided_at, decision_note }` or null.
- `GET /api/bookings/fee-requests` (pending list, with each booking's current values), `POST /api/bookings/fee-requests/[id]` `{ decision: 'approve' | 'reject', note? }`: `fees.approve`. `DELETE /api/bookings/[id]/fee-request`: withdraw, `bookings.fees`.
- Screens:
  - **Booking dialog:** a box above the money fields showing the waiting request (old → new) with Approve / Reject for admins and Withdraw for the manager, or the latest decision.
  - **Bookings → Fee approvals** (`/admin/bookings/fee-approvals`, admins): the pending list with booking, talent, date, who asked, current → requested, a note field, Approve / Reject. A link to it from the bookings page header for admins.
  - **Dashboard:** attention item `key: 'fee-requests'`, "n fee changes waiting for approval", linking to the list (admins).

## Tests (Playwright, `e2e/tests/fee-approvals.spec.ts`)

- A manager's fee change is held: the booking keeps the old fee; a pending request has the new values; other fields in the same save apply; staff shares and talent net are unchanged.
- A manager's new booking with a fee is saved with no fee and a pending request; it isn't owed.
- A second change replaces the pending request (still one row); changing back to the current values withdraws it.
- Approving applies the values and unpaid staff shares follow; the request is `approved`.
- Rejecting leaves the booking unchanged; the note shows in `fee_request`.
- An admin's own fee change applies straight away with no request.
- A manager gets 403 approving any request, their own included; road managers still can't change fees.
- Withdraw by the manager marks it `withdrawn`.
- The dashboard attention item counts pending requests.
- The booking dialog shows the waiting request and an admin approves it from there.

## Risks

- **Bookings created by managers start with no fee.** Talent and staff pay can't be worked out until the owner approves. The dashboard reminder keeps the queue visible.
- **Approving an old request after an admin edit** overwrites the admin's edit with the requested values. The list shows current → requested side by side so this is visible before approving.
