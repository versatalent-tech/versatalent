# Talent Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Talents get a bell in the portal and optional phone push for new tasks, booking changes and reminders, profile reviews, shared documents and payouts.

**Architecture:** API routes call `notify()` after a successful save. It writes rows to `notifications` and sends Web Push to the user's saved devices; push failures are logged, never thrown. An hourly Netlify function sends the day-before reminders and deletes old notifications. All wording and visibility rules live in one pure module.

**Tech Stack:** Next.js 15 App Router, Neon `sql` tagged templates, Zod, `web-push`, a service worker, Netlify scheduled functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-talent-notifications-design.md`

## Global Constraints

- Migration number: `042`. Add `migrations/042_talent_notifications.sql` to `e2e/pending-migrations.txt` (remove the line once it has run on production).
- Recipients: active users with `role = 'artist'` and a `talent_id`. Nobody else gets anything in this version.
- Bookings notify only when `shared_with_talent` is true. The client name appears only when `client_visible_to_talent` is true. Money appears only in `payout_paid`, and only as the net paid.
- Times in text are UK time (`Europe/London`, `AGENCY_TIME_ZONE`). Reminders: bookings at 10:00 UK for shared confirmed bookings starting tomorrow (UK date); tasks at 09:00 UK for open tasks due tomorrow.
- `dedupe_key` formats: `booking_reminder:<booking id>:<YYYY-MM-DD>`, `task_due:<task id>:<YYYY-MM-DD>`, `payout_paid:<booking id>:<paid_at ISO>`.
- Bell list: latest 30. Unread badge: "9+" above 9. Polling: every 60 s while the page is visible. Retention: 90 days.
- Push env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` address). If any is missing, push is skipped and `GET /api/portal/push/key` returns 404. Keys are never committed or pasted into chat.
- `src/lib/notifications/*` and `src/lib/db/repositories/notifications.ts` use relative imports only (the scheduled function and the tests import them).
- A push send times out after 5 s. A 404 or 410 reply deletes that subscription.
- Shown text is plain text (React escapes it); title ≤ 80 characters, body ≤ 200, cut with "…".

## Review Focus

1. **Booking moved to another talent:** the new talent gets `booking_shared` and the old talent gets `booking_cancelled`. Test in Task 6.
2. **A booking becomes shared in the same save that changes status or time:** one `booking_shared` only, not two. Test in Task 6.
3. **A booking at 23:30 UK, or on the day the clocks change:** "tomorrow" uses the UK date, so it isn't reminded a day early or late. Test in Task 8.
4. **A push service that's down or slow:** the save still succeeds quickly, and the notification is in the bell with `pushed_at` null. Test in Task 3.
5. **A deactivated talent login, or a talent with no login:** no rows and no push, and no error. Test in Task 3.

---

### Task 1: Storage and repository

**Files:**
- Create: `migrations/042_talent_notifications.sql`
- Create: `src/lib/db/repositories/notifications.ts`
- Create: `src/lib/notifications/types.ts`
- Modify: `e2e/pending-migrations.txt`
- Test: `e2e/tests/notifications.spec.ts` (new; `describe('Notification storage')`)

**Interfaces:**
- Produces (`types.ts`):
  - `NotificationKind = 'task_assigned' | 'task_due' | 'booking_shared' | 'booking_confirmed' | 'booking_changed' | 'booking_cancelled' | 'booking_reminder' | 'profile_reviewed' | 'document_shared' | 'payout_paid'`
  - `NotificationMessage { kind; title; body; link: string | null; dedupeKey?: string }`
  - `PortalNotification { id; kind; title; body; link; read: boolean; created_at: string }`
  - `PushDevice { id; endpoint; p256dh; auth }`
- Produces (repository):
  - `saveNotifications(userIds: string[], m: NotificationMessage): Promise<{ id: string; user_id: string }[]>`: `ON CONFLICT (dedupe_key) DO NOTHING`; returns only the rows actually inserted.
  - `listNotifications(userId, limit = 30): Promise<{ items: PortalNotification[]; unread: number }>`
  - `markNotificationsRead(userId, ids?: string[]): Promise<number>`: only rows owned by `userId`.
  - `markPushed(ids: string[])`
  - `savePushDevice(userId, d: { endpoint; p256dh; auth; userAgent: string | null })`: upsert on `endpoint`, re-pointing it to `userId`.
  - `deletePushDevice(userId, endpoint): Promise<boolean>`
  - `deletePushDeviceByEndpoint(endpoint)`
  - `listPushDevices(userIds: string[]): Promise<(PushDevice & { user_id: string })[]>`
  - `touchPushDevice(id)`
  - `deleteOldNotifications(days = 90): Promise<number>`
  - `activeTalentUserIds(talentId): Promise<string[]>`
  - `filterTalentUsers(userIds: string[]): Promise<string[]>`: keeps only active users with `role = 'artist'` and a `talent_id`.

- [ ] **Step 1: Write the failing tests:**
  - `saving with the same dedupe key twice keeps one row`: `saveNotifications([u], {…, dedupeKey: k})` twice gives lengths `[1, 0]`.
  - `marking read only touches your own`: user A's call with B's id returns 0.
  - `activeTalentUserIds skips inactive logins`: a talent with one active and one inactive login returns one id.
- [ ] **Step 2: Run** `E2E_SKIP_BUILD=1 npm run test:e2e -- notifications.spec.ts -g "storage"`. Expected: FAIL (the table and module don't exist).
- [ ] **Step 3: Write migration 042** as in the spec's Storage section. Use `BEGIN/COMMIT` and `IF NOT EXISTS`, like 041. Add `idx_notifications_user (user_id, created_at DESC)` and a partial index `idx_notifications_unread (user_id) WHERE read_at IS NULL`.
- [ ] **Step 4: Implement `types.ts` and the repository functions** above.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit**: `git commit -m "Add notification storage (migration 042)"`

### Task 2: Wording and visibility

**Files:**
- Create: `src/lib/notifications/messages.ts`
- Test: `e2e/tests/notification-messages.spec.ts` (pure functions; no page or database)

**Interfaces:**
- Consumes: `NotificationMessage` (Task 1), `Booking` from `src/lib/bookings/types.ts` (use a type-only import with a relative path).
- Produces:
  - `taskAssigned(t: { id; subject; due_at: string | null }): NotificationMessage`
  - `taskDue(t: { id; subject }, ukDate: string)`
  - `bookingChanges(before: Booking | null, after: Booking | null): { talentId: string; message: NotificationMessage }[]`. `before = null` means created; `after = null` is never passed (deletes don't notify).
  - `bookingReminder(b: Booking, ukDate: string)`
  - `profileReviewed(approved: boolean, note: string | null)`
  - `documentShared(d: { filename; booking_id: string | null })`
  - `payoutPaid(p: { id; title; paid_cents; currency; paid_at: string })`

`bookingChanges` rules, in order. "Shared" means `shared_with_talent` is true on that side.
1. Talent changed: `booking_cancelled` to the old talent if it was shared before, and `booking_shared` to the new talent if shared after.
2. Not shared after: nothing.
3. Shared after but not before (or created shared): `booking_shared` only.
4. Status became `cancelled`: `booking_cancelled`.
5. Status became `confirmed`: `booking_confirmed`.
6. Any of `starts_at`, `ends_at`, `location` or `call_time` changed: `booking_changed`, with the body listing what changed, e.g. "New time: Sat 14 Nov, 21:00 · New location: Lisbon".

Titles are exactly as in the spec's table. The booking body is `<title> · <Sat 14 Nov, 21:00>`, plus ` · <client name>` only when `client_visible_to_talent`. Links:
- tasks: `/portal`
- bookings: `/portal/bookings`
- profile: `/portal/profile`
- documents: `/portal/bookings` if `booking_id`, else `/portal/profile`
- payouts: `/portal/earnings`

- [ ] **Step 1: Write the failing tests:**
  - `unshared booking → []`
  - `created shared → one booking_shared`
  - `shared and confirmed in one save → one booking_shared` (Review Focus 2)
  - `talent changed → cancelled to old, shared to new` (Review Focus 1)
  - `moved → booking_changed body contains "New time"`
  - `client hidden unless allowed`: the body doesn't contain the client name when `client_visible_to_talent` is false
  - `payout body "£150.00 for <title>"`
  - `long subject cut to 80 with "…"`
- [ ] **Step 2: Run** `… -- notification-messages.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `messages.ts`.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Add notification wording and visibility rules"`

### Task 3: notify() and Web Push, with a pretend push service

**Files:**
- Create: `src/lib/notifications/push.ts`
- Create: `src/lib/notifications/notify.ts`
- Create: `e2e/mocks/push.mjs`, port 4012, the same shape as `e2e/mocks/sumup.mjs`:
  - `POST /push/:id` records the request and answers `201`, or `410` for ids starting `gone-`, or waits 10 s for ids starting `slow-`;
  - `GET /__requests` lists what it recorded;
  - `GET /__health`.
- Create: `e2e/support/push.ts`:
  - `pushDevice(id: string): { endpoint; p256dh; auth }` makes a real P-256 key pair with `crypto.createECDH('prime256v1')` and 16 random bytes for `auth`, base64url-encoded, with endpoint `http://127.0.0.1:4012/push/<id>`.
  - `pushRequests(): Promise<{ id: string }[]>`
- Modify: `playwright.config.ts` (add the mock server). Modify `scripts/e2e.mjs`: generate a VAPID pair with `web-push`'s `generateVAPIDKeys()` at start-up and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT=mailto:e2e@example.com` for the server.
- Modify: `package.json` (add `web-push` and `@types/web-push`).
- Test: `e2e/tests/notifications.spec.ts` (`describe('notify')`). The tests import `notify` directly.

The spec mentioned a `PUSH_TEST_ENDPOINT` variable. It isn't needed, because test devices point their endpoint at the mock.

**Interfaces:**
- Consumes: Task 1 repository and Task 2 types.
- Produces:
  - `notify(userIds: string[], m: NotificationMessage): Promise<void>`: saves the rows, pushes to the devices of the users whose rows were inserted, and calls `markPushed` for those delivered to at least one device. It never throws; it catches and logs.
  - `notifyTalent(talentId: string, m: NotificationMessage)` resolves the recipients with `activeTalentUserIds`.
  - `pushConfigured(): boolean` and `publicVapidKey(): string | null` (in `push.ts`).
  - `sendPush(device: PushDevice, payload: { title; body; link }): Promise<'sent' | 'gone' | 'failed'>` uses `webpush.sendNotification` with `{ timeout: 5000, TTL: 86400 }`.

- [ ] **Step 1: Write the failing tests:**
  - `notify saves a row and pushes to each device`: two devices give two mock requests and set `pushed_at`.
  - `a gone device is removed`: `gone-x` leaves no `push_subscriptions` row.
  - `a slow push service doesn't hang notify` (Review Focus 4): finishes in under 7 s, the row exists, `pushed_at` is null.
  - `notifyTalent with no active login does nothing` (Review Focus 5): no rows, no throw.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `push.ts`, `notify.ts`, the mock and the support helpers;** install the dependency.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Send notifications with Web Push"`

### Task 4: Portal bell, push card, service worker

**Files:**
- Create:
  - `src/app/api/portal/notifications/route.ts` (GET)
  - `src/app/api/portal/notifications/read/route.ts` (POST `{ ids?: uuid[] }`)
  - `src/app/api/portal/push/route.ts` (POST `{ endpoint: url, keys: { p256dh, auth } }`, DELETE `{ endpoint }`)
  - `src/app/api/portal/push/key/route.ts` (GET returns `{ key }`, or 404)
- Create: `src/components/portal/NotificationBell.tsx`, `src/components/portal/PushToggle.tsx`
- Create: `public/portal-sw.js`, `src/app/portal/manifest.webmanifest/route.ts` (or a static `public/portal.webmanifest`)
- Modify: `src/components/portal/PortalShell.tsx` (bell before the talent name), `src/app/portal/layout.tsx` (`<link rel="manifest">`, `apple-mobile-web-app-capable`), `src/app/portal/(app)/page.tsx` (`<PushToggle />` above "Your to-dos")
- Test: `e2e/tests/notifications.spec.ts` (`describe('Portal')`)

Every route uses `getTalentSession()`, returns 401 without it, and filters by `session.userId`.

The service worker:
- registers with scope `/portal`;
- on `push`, calls `showNotification(title, { body, data: { link }, icon: '/apple-touch-icon.png' })`;
- on `notificationclick`, focuses an open portal tab and navigates it, otherwise opens a new window at `link`.

`PushToggle` states and copy are exactly as in the spec's "What talents see". Detect iOS not opened from the Home Screen with `navigator.standalone !== true` on iPhone or iPad user agents when `PushManager` is missing.

- [ ] **Step 1: Write the failing tests:**
  - `bell shows unread count and clears on open`: seed 3 notifications, the badge shows "3", clicking the bell lists them, then the badge is gone and the API returns `unread: 0`.
  - `badge shows 9+`: seed 12.
  - `talent can't read or mark another user's notifications or remove their device`: with B's session, `read` with A's ids leaves A unread, and `DELETE /api/portal/push` with A's endpoint returns 404 and keeps A's row.
  - `saving a device via the API stores it`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the routes and components.**
- [ ] **Step 4: Run.** Expected: PASS. Also check the portal by hand at 375 px wide with the `run` skill.
- [ ] **Step 5: Commit**: `"Add the portal bell and phone notifications switch"`

### Task 5: Tasks notify

**Files:**
- Modify: `src/app/api/crm/activities/route.ts` (POST), `src/app/api/crm/activities/[id]/route.ts` (PATCH), `src/app/api/crm/meetings/[id]/tasks/route.ts`
- Modify: `src/lib/db/repositories/meetings.ts`: `createTasksFromActionItems` returns `{ id; subject; due_at; owner_user_id }[]` instead of a count (update its caller's count).
- Test: `e2e/tests/notifications.spec.ts` (`describe('Triggers')`)

Notify with `taskAssigned` when `type === 'task'`, `owner_user_id` is set and isn't the actor, and on PATCH only when `owner_user_id` changed. Pass the owner through `filterTalentUsers` (Task 1) first, so road managers and the team get nothing in this version, then call `notify`.

- [ ] **Step 1: Write the failing tests:**
  - `giving a task to a talent notifies them`: admin creates a task for the talent login, giving one `task_assigned` with the subject.
  - `re-assigning notifies the new owner only`.
  - `a task for a road manager doesn't notify` (not a talent).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Notify talents about tasks"`

### Task 6: Bookings notify

**Files:**
- Modify: `src/app/api/bookings/route.ts` (POST: after `createBooking`, load it with `getBooking(ctx.scope, false, id)` and use `bookingChanges(null, after)`), `src/app/api/bookings/[id]/route.ts` (PATCH: the route already loads `before` and `after`; use `bookingChanges(before, after)`). Send each result with `notifyTalent`.
- Test: `e2e/tests/notifications.spec.ts` (`describe('Triggers')`)

- [ ] **Step 1: Write the failing tests** through the admin API:
  - `unshared booking: nothing; sharing it: one "New booking"`
  - `confirm, move, cancel: one each, with the right titles`
  - `moving a booking to another talent` (Review Focus 1): old talent "Booking cancelled", new talent "New booking"
  - `client name only when allowed`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Notify talents about booking changes"`

### Task 7: Profile reviews, documents, payouts

**Files:**
- Modify: `src/app/api/admin/talent-portal/requests/[id]/route.ts` (after `reviewProfileChange`: `profileReviewed`, sent to the request's talent)
- Modify: `src/app/api/documents/route.ts` (POST) and `src/app/api/documents/[id]/route.ts` (PATCH): when the document is `visible_to_talent` and wasn't before (or is new), and isn't `admin_only` or on a deal, call `documentShared`. Recipient: `talent_id`, or the booking's talent if the booking is shared.
- Modify: `src/lib/db/repositories/bookings.ts` (`markPayoutsPaid` also returns `talent_id` and `paid_at`), `src/app/api/payouts/paid/route.ts` (`payoutPaid` for each).
- Test: `e2e/tests/notifications.spec.ts` (`describe('Triggers')`)

- [ ] **Step 1: Write the failing tests:**
  - `approved and rejected profile changes notify`
  - `document made visible notifies once; a hidden one doesn't; one on an unshared booking doesn't`
  - `payout notifies with the net amount; marking the same booking paid again after clearing gives a second notification`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Notify talents about profile reviews, documents and payouts"`

### Task 8: Reminders and clean-up job

**Files:**
- Create: `src/lib/notifications/reminders.ts`: `runReminders(now = new Date()): Promise<{ bookings: number; tasks: number; deleted: number }>`.
  - If the UK hour of `now` is 10, send `bookingReminder` for shared confirmed bookings whose UK start date is tomorrow's UK date.
  - If the UK hour is 9, send `taskDue` for open tasks with a talent owner whose `due_at` UK date is tomorrow.
  - Always run `deleteOldNotifications(90)`.
- Create: `netlify/functions/talent-reminders.mts`, with `export const config = { schedule: '@hourly' }`, calling `runReminders()`.
- Test: `e2e/tests/notifications.spec.ts` (`describe('Reminders')`), calling `runReminders(new Date(...))` directly.

- [ ] **Step 1: Write the failing tests:**
  - `booking reminder sent once at 10:00 UK`: two runs at 10:05 on the day before give one row.
  - `not sent at 11:00`.
  - `booking at 23:30 UK tomorrow is reminded; one at 00:30 the day after isn't` (Review Focus 3).
  - `clock-change day`: on 28 Mar 2027, a run at 09:05 UTC (10:05 BST) sends.
  - `task due tomorrow reminded at 09:00`.
  - `notifications older than 90 days are deleted`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit**: `"Send booking and task reminders"`

### Task 9: Privacy, setup notes, full run

**Files:**
- Modify: the privacy notice page (`src/app/privacy/page.tsx`): one line saying the talent portal can send phone notifications that the talent switches on, and they can be turned off at any time on the portal or in the phone's settings.
- Create: `docs/NOTIFICATIONS_SETUP.md`:
  - generating keys: `npx web-push generate-vapid-keys`, run by the owner or saved to a file outside the repo;
  - the three Netlify variables (Functions scope), then redeploy;
  - checking on Android and on iPhone (Home Screen first).
- Modify: `.same/todos.md`: add the setup and the phone check to "Check after the latest deploys"; add email delivery to Later.

- [ ] **Step 1: Run the whole suite**: `npm run test:e2e`. Expected: all pass, including the 53 existing tests.
- [ ] **Step 2: Run** `npm run lint` and `npx tsc --noEmit`. Expected: no new errors.
- [ ] **Step 3: Commit**: `"Notifications: privacy line, setup notes, to-do list"`
