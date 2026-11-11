# Ticket PDFs and Door Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One QR-coded ticket per person, a confirmation PDF per order made from Admin → Tickets, and door admission on the event day page by QR scan, VIP card tap or name/email/reference search.

**Architecture:** A `tickets` table (one row per person, random `VT-` code) filled the first time an order's tickets are needed. A `door-tickets` repository owns admission (by code, card, or ticket id) and keeps `ticket_orders.arrived_at` in step. The PDF is built on the server with `pdf-lib` + `qrcode` and stored with the existing document storage. The event day page gets a camera scanner (`qr-scanner`) and a search panel; the card check-in route gains the "no ticket, no check-in" rule for events with ticket types.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (`sql` tagged templates), Zod, Netlify Blobs (via `src/lib/services/document-storage.ts`), Playwright e2e (`npm run test:e2e`, `E2E_SKIP_BUILD=1` to reuse the last build; `npm run test:e2e:typecheck` must also pass, CI runs it first).

**Spec:** `docs/superpowers/specs/2026-11-10-door-tickets-design.md`

## Global Constraints

- New packages (exact versions, all over two weeks old): `pdf-lib@1.17.1`, `qrcode@1.5.4`, `@types/qrcode@1.5.6` (dev), `qr-scanner@1.4.2`. After `npm install`, refresh `bun.lock` with `npx -y bun@1.3.14 install --lockfile-only` (CI runs `bun install --frozen-lockfile`).
- Code format: `VT-` + 26 characters of RFC 4648 base32 (A–Z, 2–7) from 16 random bytes (`crypto.randomBytes`). `isTicketCode` accepts only that shape (case-insensitive, trimmed, upper-cased before lookup).
- A ticket is admissible only while its order's `status = 'paid'` and the order's `event_id` is the door's event.
- `admitted_via ∈ {'qr','card','manual'}`; `admitted_by_name` = the staff session's name.
- `ticket_orders.arrived_at` = time of the first admitted ticket, null when none are admitted.
- PDF storage key `tickets/<order id>.pdf`; served `application/pdf`, `Content-Disposition: attachment; filename="VersaTalent-<event title>-<reference>.pdf"` (title reduced to letters, digits and hyphens), `Cache-Control: private, no-store`.
- Admin ticket routes use `requireTeamPermission('venue.manage')` (as the existing ticket order routes); door routes accept any signed-in staff or admin session (`getCurrentSession()`, as the card check-in route) and need the event's check-ins switched on (`getEventDayEvent(eventId).checkins_enabled`).
- "Event sells tickets on the website" = at least one row in `ticket_types` for the event.
- Copy is fixed by the spec's result table; reuse the existing beep.
- Migration 045 goes in `e2e/pending-migrations.txt` as `045_door_tickets.sql` until it runs on production.
- No test file may add a new line assigning a literal or generated password (GitGuardian flags `const password = \`E2e-…\``): sign-ins reuse the existing helpers (`createTeamUser`, `createTalentLogin`, `adminApi`).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Two door devices scanning the same QR at the same moment: exactly one is admitted, the other gets "Already used" (Task 2 test: two parallel admits).
2. An order refunded after its PDF was made: its codes are refused and the admin can't remake the PDF (Task 2 and Task 1 tests).
3. A member whose ticket was bought with a different-case email (`Maria@X.com` vs `maria@x.com`): the card tap still finds it (Task 3 test).
4. A card tap by a member who already checked in earlier: no second ticket is used up (Task 3 test).
5. Searching with `%` or `_` in the box: treated as text, not wildcards (Task 2 test).

---

### Task 1: Tickets, codes and the PDF

**Files:**
- Create: `migrations/045_door_tickets.sql` (spec's Storage section; `BEGIN; … COMMIT;`; header comment like 044)
- Modify: `e2e/pending-migrations.txt`, `package.json`, `bun.lock`
- Create: `src/lib/tickets/codes.ts`, `src/lib/tickets/pdf.ts`, `src/lib/db/repositories/door-tickets.ts`
- Create: `src/app/api/admin/tickets/orders/[id]/pdf/route.ts` (POST create/remake, GET download)
- Modify: `e2e/support/tickets.ts` (helper below)
- Test: `e2e/tests/door-tickets.spec.ts` (new; `test.describe('Ticket PDFs')`)

**Interfaces:**
- Produces:
  - `newTicketCode(): string`, `isTicketCode(text: string): boolean`
  - `interface DoorTicket { id: string; order_id: string; number: number; quantity: number; ticket_type_name: string; code: string; admitted_at: string | null; admitted_by_name: string | null; admitted_via: 'qr' | 'card' | 'manual' | null }`
  - `ensureOrderTickets(orderId: string): Promise<DoorTicket[]>`: inserts missing rows numbered 1..quantity across the order's items (items ordered by id; each item's `name` becomes `ticket_type_name`), `ON CONFLICT (order_id, number) DO NOTHING`, returns all rows ordered by number. Only for paid orders; returns `[]` otherwise.
  - `buildTicketPdf(input: { reference: string; buyerName: string; event: { title: string; startsAt: string | null; venue: string | null }; tickets: DoorTicket[] }): Promise<Uint8Array>`: one A4 page per ticket with the spec's content; sets the document title to `VersaTalent ticket <reference>`; logo from `public/images/versatalent-new-logo.png` read with `fs` (skip the logo if the file can't be read).
  - `POST /api/admin/tickets/orders/[id]/pdf` → 409 unless paid; ensures tickets, builds, `saveDocumentFile('tickets/<id>.pdf', …)`, sets `pdf_key`, `pdf_created_at`, returns the PDF bytes (download headers). `GET` → 404 when no `pdf_key`, else streams the stored file.
  - Test helper `paidOrder(eventId: string, items: { name: string; quantity: number }[], buyer?: { email?: string; first_name?: string; last_name?: string; member_user_id?: string }): Promise<{ id: string; reference: string }>` in `e2e/support/tickets.ts`: inserts a paid `ticket_orders` row (all NOT NULL columns, `hold_until NOW()`, `terms_accepted_at NOW()`, `paid_at NOW()`, unique reference `uniq('VT')`, `access_token` random) plus its `ticket_order_items`.

- [ ] **Step 1: Write the failing tests**
  - `'Create PDF makes one ticket per person, numbered by item'`: order 2× "Standard" + 1× "VIP" → POST pdf 200, `content-type` `application/pdf`; `SELECT number, ticket_type_name, code FROM tickets` → `[1 Standard, 2 Standard, 3 VIP]`, codes match `/^VT-[A-Z2-7]{26}$/` and are distinct; `PDFDocument.load(body).getPageCount()` = 3 and `getTitle()` contains the reference; `ticket_orders.pdf_key` = `tickets/<id>.pdf`.
  - `'Remake keeps the codes; Download returns the stored PDF'`: POST twice → same codes; GET → 200 with 3 pages.
  - `'no PDF for an unpaid or refunded order'`: status `pending` → 409; status `refunded` → 409.
  - `'only admins can make or download PDFs'`: manager (`createTeamUser('manager')`) → 403; anonymous → 401.
- [ ] **Step 2: Run** `npm run test:e2e -- door-tickets` → FAIL (404 route / table missing).
- [ ] **Step 3: Install packages and implement.**
- [ ] **Step 4: Run** the same → PASS; `npx tsc --noEmit -p .` and `npm run test:e2e:typecheck` clean.
- [ ] **Step 5: Commit** `feat: ticket codes and confirmation PDFs (migration 045)`

### Task 2: Admitting at the door

**Files:**
- Modify: `src/lib/db/repositories/door-tickets.ts`, `src/lib/db/repositories/tickets.ts` (`setOrderArrived` delegates to door tickets)
- Create: `src/app/api/staff/event-day/[eventId]/tickets/route.ts` (GET search), `…/tickets/admit/route.ts` (POST), `…/tickets/[ticketId]/admit/route.ts` (POST, by hand), `…/tickets/[ticketId]/undo/route.ts` (POST)
- Test: `e2e/tests/door-tickets.spec.ts` (`test.describe('At the door')`)

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `type AdmitResult = { status: 'admitted' | 'already_used' | 'other_event' | 'refunded' | 'cancelled' | 'unknown'; ticket?: DoorTicket; order?: { id: string; reference: string; name: string; in_count: number; quantity: number }; event_title?: string }`
  - `admitByCode(eventId: string, code: string, actor: { userId: string | null; name: string | null }): Promise<AdmitResult>`: the claim is one `UPDATE tickets … WHERE code = $1 AND admitted_at IS NULL AND <order paid and for this event> RETURNING …`; when it updates nothing, a read decides between already_used / other_event / refunded / cancelled / unknown. Sets `arrived_at` with `COALESCE`.
  - `admitTicket(ticketId, eventId, actor, via: 'card' | 'manual'): Promise<AdmitResult>` (same claim by id).
  - `undoTicket(ticketId: string, eventId: string): Promise<boolean>` (clears admission; clears `arrived_at` when the order has none in).
  - `searchDoorOrders(eventId: string, q: string): Promise<{ id: string; reference: string; name: string; email: string; quantity: number; tickets: DoorTicket[] }[]>`: paid orders for the event matching first/last/full name, email or reference (`ILIKE` with `%`, `_` and `\` escaped), max 20; calls `ensureOrderTickets` for orders without rows.
  - `ticketCounts(eventId: string): Promise<{ in: number; total: number }>` (total = sum of paid orders' quantity).
  - `setOrderArrived(orderId, arrived)`: ticking admits all remaining tickets (`via 'manual'`, ensuring rows); unticking clears all; still returns false for unpaid orders.
  - Routes: staff session (401 otherwise) and `checkins_enabled` (409 otherwise). Admit-by-code body `{ code: string }`; a code that fails `isTicketCode` → 200 `{ status: 'unknown' }`. Responses are `AdmitResult` with HTTP 200 for every status (the page shows them). Search needs `q` ≥ 2 characters (else `[]`).
  - Test helper: an event whose check-ins are on, as in `phone-nfc.spec.ts` (`createEvent({ startsInDays: 0 })` + `INSERT INTO nfc_events … is_active true, event_id`).

- [ ] **Step 1: Write the failing tests**
  - `'a valid code is admitted once'`: admit → `admitted`, `order.in_count 1`, `arrived_at` set; again → `already_used` with `ticket.admitted_at`.
  - `'two devices scanning together: one admitted, one already used'`: `Promise.all` of two admits → statuses sorted `['admitted','already_used']`.
  - `'another event’s ticket, a refunded order and garbage are refused'`: → `other_event` (with `event_title`), `refunded`, `unknown` (for `'hello'` and for a well-formed but unknown `VT-` code).
  - `'search finds orders by email, last name and reference; % is literal'`: three searches each return the order with its tickets; searching `'%'` returns `[]`.
  - `'admit by hand and undo'`: admit ticket 2 by id → `via 'manual'`; undo → cleared; `arrived_at` null again.
  - `'the admin door list tick admits everyone left; unticking undoes'`: PATCH `{ action: 'arrived', arrived: true }` → all tickets admitted; false → none.
  - `'door actions need a signed-in staff member'`: anonymous admit / search → 401.
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; type-checks clean.
- [ ] **Step 5: Commit** `feat: admit tickets at the door by code, by hand or from the door list`

### Task 3: VIP card tap needs a ticket at ticketed events

**Files:**
- Modify: `src/lib/db/repositories/door-tickets.ts`, `src/app/api/staff/event-day/[eventId]/checkin/route.ts`
- Test: `e2e/tests/door-tickets.spec.ts` (`test.describe('VIP cards')`)

**Interfaces:**
- Consumes: Task 2 `admitTicket`, `ensureOrderTickets`.
- Produces:
  - `eventSellsTickets(eventId: string): Promise<boolean>`
  - `memberTicketsForEvent(eventId: string, userId: string): Promise<DoorTicket[]>`: paid orders for the event with `member_user_id = userId` or `lower(email) = lower(<user's email>)`, tickets ensured, ordered by order then number.
  - Check-in route, only when `eventSellsTickets`: after the existing "already checked in" branch (unchanged) and before creating a check-in: no tickets → log the scan as an error ("No ticket"), return 404 `{ error: 'No ticket for this event', code: 'NO_TICKET', customer }`; first unadmitted ticket → `admitTicket(…, 'card')`, then the existing check-in and points, and the response gains `ticket: AdmitResult`; all admitted → existing `already_checked_in`-style response with `status: 'already_in'`.

- [ ] **Step 1: Write the failing tests** (member card as in `phone-nfc.spec.ts`: `createMember()` + `nfc_cards` row; tap via `POST /api/staff/event-day/<id>/checkin { card_uid }` as admin)
  - `'a member with a ticket is admitted by card and gets points'`: order linked by `member_user_id` → 201, `ticket.status 'admitted'`, `admitted_via 'card'`, points awarded (`pointsFor` status > 0).
  - `'tapping again does not use up another ticket'`: order of 2 linked → second tap `already_checked_in`; only 1 ticket admitted.
  - `'a ticket bought with the member’s email in a different case is found'`: order email = member email upper-cased, not linked → admitted.
  - `'no ticket, no check-in'`: event with a ticket type, member has no order → 404 `NO_TICKET`; no `nfc_checkins` row; points unchanged.
  - `'events without tickets on the website are unchanged'`: no ticket types → 201 checked in.
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS (also `npm run test:e2e -- phone-nfc` still passes).
- [ ] **Step 5: Commit** `feat: VIP card taps admit the member's ticket at ticketed events`

### Task 4: Screens

**Files:**
- Modify: `src/app/admin/(protected)/(admin-only)/tickets/page.tsx` (PDF buttons on paid orders in the orders list and door list; door list shows "<in> of <quantity> in")
- Modify: `src/app/api/admin/tickets/orders/route.ts` / the orders query in `src/lib/db/repositories/tickets.ts` (each order gains `pdf_created_at` and `in_count`)
- Create: `src/components/staff/TicketScanner.tsx` (camera via `qr-scanner`, dynamic import, 3-second repeat guard, camera-permission help text), `src/components/staff/TicketSearch.tsx`
- Modify: `src/app/staff/event-day/[eventId]/page.tsx` ("Scan ticket" button opening the scanner, "Find a ticket" panel, result view for `AdmitResult` and `NO_TICKET`, "Tickets in: n of m" stat from `ticketCounts` added to the existing event-day GET)
- Modify: `src/app/api/staff/event-day/[eventId]/route.ts` (adds `tickets: { in, total } | null`, null when the event has no ticket types)
- Test: `e2e/tests/door-tickets.spec.ts` (`test.describe('Screens')`)

**Interfaces:**
- Consumes: Tasks 1–3 routes.
- Admin buttons: "Create PDF" (no PDF yet), "Download PDF" and "Remake PDF" (PDF exists); both POST/GET trigger a browser download (fetch → blob → object URL).
- Result copy exactly as the spec's table; the card `NO_TICKET` result shows "No ticket for this event" with the member's name.

- [ ] **Step 1: Write the failing tests**
  - `'admin creates and downloads a ticket PDF'`: on `/admin/tickets` for the event, the order row's "Create PDF" triggers a download whose suggested filename ends with `<reference>.pdf`; the row then shows "Download PDF".
  - `'door: find a ticket and admit it'`: `/staff/event-day/<id>` → "Find a ticket" → type the buyer's last name → Admit on ticket 1 → "Admitted" result and the ticket shows "In at"; the stat reads "Tickets in: 1 of 2".
  - `'door: the scan button opens the scanner'`: with a fake camera (`--use-fake-device-for-media-stream` is not available, so stub `navigator.mediaDevices.getUserMedia` to reject) → the help text about allowing the camera shows and "Find a ticket" still works.
  - `'admin door list shows how many are in'`: one of two admitted → "1 of 2 in".
- [ ] **Step 2: Run** (with build) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `npx next lint` no warnings; both type-checks clean.
- [ ] **Step 5: Commit** `feat: ticket PDF buttons, door scanner and ticket search`

### Task 5: Docs and full suite

**Files:**
- Modify: `.same/todos.md` (Check: "Ticket PDFs and door scanning (migration 045): make a PDF for a test order, scan its QR with a phone on the event day page, tap a VIP card with and without a ticket, find and admit a ticket by name"; Completed; Later: "Email the ticket PDF automatically (needs the email provider)", "Show the QR codes on the buyer's order page"; test count; date)
- Modify: `src/app/privacy/page.tsx` only if ticket data use changes (it doesn't: same order data) — no change expected

- [ ] **Step 1: Run** `npm run test:e2e` and `npm run test:e2e:typecheck` → all pass.
- [ ] **Step 2: Commit** `docs: ticket PDFs and door scanning to-dos`
