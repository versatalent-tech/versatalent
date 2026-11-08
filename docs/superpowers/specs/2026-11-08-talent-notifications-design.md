# Talent notifications: design

_8 Nov 2026. Approved in conversation: portal bell + phone push, app-side creation (approach 1)._

## Goal

Talents find out when something changes for them (tasks, bookings, profile, documents, payouts) without having to open the portal and look. Email isn't set up yet, so this works without it, and email can be added to the same notifications later.

**Who:** talents with a portal login (an active `users` row with `role = 'artist'` and a `talent_id`). Notifications are stored per user, so road managers could get them later, but only the talent portal shows them in this version. Talents without a login get nothing. Nothing goes to clients or members.

**Out of this version:** email, per-category on/off switches, quiet hours, road manager / team notifications.

## What talents see

**Bell (portal header, `PortalShell`):** bell icon with an unread count (shows "9+" above 9). Tapping opens a panel listing notifications newest first: title, one line of text, time ago, unread ones highlighted. Each links to its page. Opening the panel marks everything in it read. Notifications older than 90 days are deleted by the reminder job.

**Phone push:** a card on the portal home page:
- Push supported and off on this device: "Get notifications on this phone" + button. Turning on asks the browser for permission and saves the device.
- On: "Notifications are on for this phone" + "Turn off".
- iPhone/iPad Safari not opened from the Home Screen (no push without it): steps to add the portal to the Home Screen (Share → Add to Home Screen), then open it from there.
- Permission refused: how to allow it again in the browser's settings.
- Push not set up on the server (no VAPID keys): the card isn't shown; the bell still works.

Tapping a push opens (or focuses) the portal at the notification's link.

## Triggers and wording

All wording lives in one module, which is also where visibility is decided. A booking only ever notifies if `shared_with_talent` is true. The client's name only appears if `client_visible_to_talent` is true. Money only appears in payout notifications, and only the talent's net amount paid.

| Kind | When | Title / text | Link |
|---|---|---|---|
| `task_assigned` | A task is created with this user as owner, or re-assigned to them (`createActivity`, `updateActivity`, `createTasksFromActionItems`). Not when they add one for themselves | "New to-do" / task subject, "due 12 Nov" if set | `/portal` |
| `task_due` | 9am UK, open task due tomorrow | "Due tomorrow" / subject | `/portal` |
| `booking_shared` | Booking created as shared, or sharing switched on | "New booking" / title, date, time | `/portal/bookings` |
| `booking_confirmed` | Status changes to confirmed | "Booking confirmed" / title, date | `/portal/bookings` |
| `booking_changed` | Start, end, location or call time changes on a shared, non-cancelled booking | "Booking changed" / title + what changed | `/portal/bookings` |
| `booking_cancelled` | Status changes to cancelled (shared bookings) | "Booking cancelled" / title, date | `/portal/bookings` |
| `booking_reminder` | 10am UK, shared confirmed booking starting tomorrow | "Tomorrow" / title, call time or start time, location | `/portal/bookings` |
| `profile_reviewed` | Profile change approved or rejected (`reviewProfileChange`) | "Profile change approved" / "…not approved" + note if any | `/portal/profile` |
| `document_shared` | A document on their profile or one of their bookings is created visible to talent, or switched to visible (`createDocument`, `updateDocument`) | "New document" / filename | `/portal/bookings` or `/portal/profile` |
| `payout_paid` | A booking's payout is marked paid (`markPayoutsPaid`) | "Payment sent" / net amount, booking title | `/portal/earnings` |

If one save matches more than one booking kind, one notification is sent, in this order: cancelled, then confirmed, then changed. Deleting a booking doesn't notify (cancelling is the normal way). Exact page links can be refined during the build (for example, `/portal/bookings#<id>` if the page supports it).

## Storage (migration 042)

```sql
notifications (
  id uuid PK, user_id uuid NOT NULL → users ON DELETE CASCADE,
  kind text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '',
  link text, dedupe_key text UNIQUE,
  read_at timestamptz, pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)
-- index (user_id, created_at DESC); partial index on unread

push_subscriptions (
  id uuid PK, user_id uuid NOT NULL → users ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE, p256dh text NOT NULL, auth text NOT NULL,
  user_agent text, created_at, last_used_at
)
```

`dedupe_key` is set for reminders (`booking_reminder:<booking>:<date>`, `task_due:<task>:<date>`) and payouts (`payout_paid:<booking>:<paid_at>`). `INSERT … ON CONFLICT DO NOTHING` makes the job and retries safe. Other kinds leave it null.

## Code

- `src/lib/notifications/messages.ts`: builds `{kind, title, body, link, dedupeKey}` from a task, booking (before/after), profile review, document or payout. Pure functions, no database.
- `src/lib/notifications/notify.ts`: `notify(userIds, message)` saves the rows, then sends push to each user's devices. Push errors are logged and never thrown: the change that caused the notification has already been saved and stays saved. A 404/410 from the push service deletes that subscription. Recipients are looked up from `users` (active, artist role, matching `talent_id`). Relative imports only, so the scheduled function can use it.
- `src/lib/notifications/push.ts`: wraps the `web-push` library with the VAPID keys from `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (mailto). If they aren't set, push is skipped. In tests, `PUSH_TEST_ENDPOINT` points sends at a pretend push service (same approach as the pretend SumUp).
- `src/lib/db/repositories/notifications.ts`: list (latest 30), unread count, mark read, save/delete subscription, cleanup.
- Calls to `notify` are added in the API routes after a successful save. Bookings compare the row before and after.
- API (talent session only; every query filters by the session's `userId`):
  - `GET /api/portal/notifications`: list + unread count
  - `POST /api/portal/notifications/read`: mark all (or given ids) read
  - `POST /api/portal/push`: save this device; `DELETE`: remove it
  - `GET /api/portal/push/key`: public VAPID key, or 404 if push isn't set up
- `public/portal-sw.js`: service worker scoped to `/portal`. Handles `push` (shows the notification) and `notificationclick` (opens the link).
- Portal web app manifest (name "VersaTalent Portal", start `/portal`, display standalone, existing icons) so iPhones can add it to the Home Screen and receive push.
- `src/components/portal/NotificationBell.tsx`: polls the unread count every 60 seconds while the page is visible. `PushToggle.tsx`: the home page card.
- `netlify/functions/talent-reminders.mts`: runs hourly. At 10:00 UK time it sends booking reminders, and at 09:00 task reminders. Each run also deletes notifications older than 90 days.

## Setup (one-off, by the owner)

I generate a VAPID key pair locally and put the keys in a file outside the repo, never in chat. The owner adds the three variables in Netlify (Functions scope) and redeploys. The privacy notice gets one line: the portal can send phone notifications that the talent switches on, and they can be turned off at any time.

## Tests (Playwright, `e2e/tests/notifications.spec.ts`)

- Giving a task to a talent creates a notification and a push to their saved device; adding one for yourself doesn't.
- A booking that isn't shared doesn't notify; sharing it, confirming, moving and cancelling it each notify once, with the right wording; the client name is hidden unless allowed.
- Profile review, document made visible and payout paid each notify.
- Running the reminder job twice for the same day sends one reminder.
- The bell shows the unread count, and opening it brings it to 0.
- A talent can't read or mark another user's notifications, or remove another user's device.
- A push service reply of 410 removes the device.

## Risks

- **iPhone:** push only works after adding the portal to the Home Screen (iOS 16.4+). The card explains this, but some talents won't do it. They still see the bell.
- **Timing of reminder hours:** the hourly job uses UK time, so it handles clock changes.
- **Push delivery isn't guaranteed** (phone off, battery saver). The bell is the source of truth.
