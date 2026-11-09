# Manager and road manager payouts: design

_9 Nov 2026. Approved in conversation: share of the agency's commission, earned on their talents' bookings, fixed when the booking is created, shown on their dashboard._

## Goal

Managers and road managers earn a percentage of the agency's commission on the bookings of the talents they look after. The owner sets each person's percentage the same way talent commission is set, and records when each share is paid, the same way talent payouts are recorded today.

**Who earns:** active users with role `manager` or `road_manager`, linked to the booking's talent in `talent_assignments`, with a rate set. Admins don't earn shares. Two people linked to the same talent both earn their own share.

**The talent is never affected:** a share comes out of what the agency keeps. The talent's net pay, and everything the talent sees, stays as it is.

**Out of this version:** a different rate per talent for the same person, notifications to staff when they're paid, staff shares on anything other than bookings.

## The rules

**Amount.** `share = round(agency commission × rate / 100)`, where agency commission is the booking's existing `commissionCents(fee, commission_percent)` (already rounded to the penny). Example: £1,000 fee, 20% commission → agency £200; rate 10% → £20.00. Same currency as the booking. No fee, or no commission % on the booking, means a share of £0, and these are left off the owed list as "No fee set" is today.

**Fixed when the booking is created.** Creating a booking adds one share row for each person who earns from it, copying their current rate. After that:
- Changing someone's rate, or linking/unlinking them from a talent, only affects bookings created afterwards.
- Changing the fee or the booking's commission % changes the amount of unpaid shares (they're worked out from the booking at the time). A paid share keeps the amount paid.
- Changing the booking's talent removes its unpaid shares and adds shares for the new talent's people, at their current rates. Paid shares stay.

**First rate set (launch and new staff).** When a person's rate goes from not set to a number, their linked talents' bookings that aren't cancelled and haven't been paid to the talent yet get a share for them too (if they don't already have one). Rate changes after that don't do this.

**Owed.** A share is owed when its booking has finished (`ends_at` passed), is confirmed or completed, has a fee, the share amount is above £0, and the share isn't paid. Talent pay and staff shares are independent: either can be paid first. Cancelled bookings owe nothing.

**Deactivated staff.** Shares already created stay owed and payable. Deactivated people get no shares on new bookings.

## Storage (migration 043)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_percent numeric(5,2)
  CHECK (share_percent IS NULL OR (share_percent >= 0 AND share_percent <= 100));

booking_staff_shares (
  booking_id uuid NOT NULL → bookings ON DELETE CASCADE,
  user_id uuid NOT NULL → users ON DELETE CASCADE,
  share_percent numeric(5,2) NOT NULL (0–100),   -- copied when the share was created
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz, paid_cents integer (>= 0),
  paid_reference text, paid_by uuid → users ON DELETE SET NULL,
  PRIMARY KEY (booking_id, user_id)
)
-- index (user_id) and partial index on unpaid shares
```

`users.share_percent` only applies to managers and road managers; it's ignored for other roles. Team members are deactivated rather than deleted, so `ON DELETE CASCADE` on `user_id` doesn't remove pay history in practice.

## Permissions

- Setting team rates: `rates.manage` (admins only), like talent rates.
- Seeing and paying team shares: a new permission `payouts.team`, admins only. A manager keeps `payouts.manage` for talent payouts but can't see the Team tab or mark their own share paid.
- Seeing your own earnings: managers and road managers, on their own shares only. The response contains the booking's title, date, talent name, the share amount and its paid state: never the fee, the commission, the rate, or anyone else's share.

## Code

- `src/lib/bookings/types.ts`: `staffShareCents(feeCents, commissionPercent, sharePercent)` next to `commissionCents`, plus `TeamRate` and `StaffShare` types.
- `src/lib/db/repositories/staff-shares.ts`:
  - `addStaffShares(bookingId)`: insert shares for the booking's talent's active, rated managers/road managers (`ON CONFLICT DO NOTHING`).
  - `replaceUnpaidStaffShares(bookingId)`: delete unpaid shares, then `addStaffShares`.
  - `listTeamRates()`, `setTeamRates(rates)`: returns who went from not set to a number, and backfills their shares (the rule above) in the same call.
  - `listOwedStaffShares()`, `listRecentStaffShares(days = 120)`, `markStaffSharesPaid(actor, shares, paidOn, reference)`, `clearStaffShare(bookingId, userId)`: same shape and same SQL conditions as the talent payout functions; the paid amount is the share at that moment.
  - `listMyEarnings(userId)`: owed and recently paid (120 days) shares for one person.
- `createBooking` calls `addStaffShares`; `updateBooking` calls `replaceUnpaidStaffShares` when `talent_id` changed.
- API:
  - `GET /api/team-rates`, `PUT /api/team-rates` (`rates.manage`; audit-logged like talent rates)
  - `GET /api/payouts/team?view=owed|paid`, `POST /api/payouts/team/paid` (`{ shares: [{ booking_id, user_id }], paid_on, reference }`), `DELETE /api/payouts/team/[bookingId]/[userId]` (all `payouts.team`)
  - `GET /api/earnings/mine` (managers and road managers)
- Screens:
  - **Bookings → Commission Rates**: a "Team" list under the talents (name, role, % of the agency's commission), saved with its own button. Text: "A share of the agency's commission on each booking for the talents they look after."
  - **Bookings → Payouts**: Talents | Team tabs (Team only with `payouts.team`). Team groups owed shares by person, with the same tick, mark paid (date + reference), undo and Owed / Recently paid views as the talent tab.
  - **Dashboard**: a "Your earnings" card for managers and road managers: total owed, owed shares by booking, and recently paid. An admin's dashboard gets an attention line "Team pay owed" linking to the Team tab.

## Tests (Playwright, `e2e/tests/staff-payouts.spec.ts`)

- Amounts: £1,000 at 20% commission and a 10% rate → £20.00; no rate set → no share; two people on one talent → two shares; a booking with no fee is never owed.
- Fixed at creation: changing a rate after a booking is created leaves that booking's share at the old rate; a new booking uses the new rate.
- Changing a booking's talent moves unpaid shares to the new talent's people and keeps paid ones.
- Setting a first rate adds shares to that person's talents' unpaid bookings, but not to cancelled ones or ones already paid to the talent; changing the rate later doesn't add or change anything.
- Owed and Recently paid lists; marking paid stores the amount; undo clears it; a share on an unfinished booking can't be marked paid.
- A manager gets 403 on the team payout and team rate endpoints.
- `/api/earnings/mine` returns only the caller's shares and never the fee, commission or rate.

## Risks

- **Road managers can't see fees today.** Seeing their own share lets them check their pay, and also lets them roughly work out the fee from it. Accepted.
- **Shares adding up past 100%.** Each rate is 0–100% of the agency's commission; if several people on one talent together exceed 100%, the agency pays out more than it keeps on those bookings. The rates page shows a warning when a talent's linked people add up to more than 100%.
