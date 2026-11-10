# Ticket PDFs and door scanning: design

_10 Nov 2026. Approved in conversation: one QR per ticket; the PDF is made when the owner presses a button on the event's ticket admin page and stored for sending by hand; QR codes are scanned with the phone or tablet camera; at a ticketed event a VIP card without a ticket is refused._

## Goal

Every ticket bought on the website gets a QR code the buyer shows at the door. The owner makes a confirmation PDF per order from the admin, downloads it and emails it to the buyer by hand (no email provider yet). At the door, staff on the event day page let people in by scanning the QR, by tapping a VIP card (which also gives the member's check-in points), or by finding the ticket by name, email or order reference.

**Out of this version:** sending the PDF by email, showing the QR codes on the buyer's order page, handheld barcode scanners (a scanner that types into the page will work with the search box, but isn't designed for), transferring tickets between people.

## Tickets and codes (migration 045)

```sql
tickets (
  id uuid PK DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL → ticket_orders ON DELETE CASCADE,
  number integer NOT NULL,                 -- 1..order quantity
  ticket_type_name text NOT NULL,          -- from the order's items
  code text NOT NULL UNIQUE,               -- what the QR holds
  admitted_at timestamptz,
  admitted_by uuid → users ON DELETE SET NULL,
  admitted_by_name text,
  admitted_via text CHECK (admitted_via IN ('qr', 'card', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, number)
)
ticket_orders: + pdf_key text, + pdf_created_at timestamptz
```

- **Code:** `VT-` followed by 26 random base32 characters (128 bits), so it can't be guessed. The QR holds exactly this text.
- **When tickets are made:** the first time Create PDF is pressed for a paid order, one row per ticket (`quantity` rows). Numbering follows the order's items, so an order of 2 Standard + 1 VIP gives 1–2 Standard and 3 VIP. Remaking the PDF reuses the same rows and codes.
- **Usable:** a ticket can be admitted only while its order is `paid`. A refunded or cancelled order's tickets are refused at the door.
- **The door list's `arrived_at`:** it's set when the order's first ticket is admitted and cleared when none are, so existing reports keep working.

## The PDF (Admin → Tickets, event's orders and door list)

- **Paid orders without a PDF** have **Create PDF**: it makes the tickets if needed, builds the PDF, stores it, and starts the download.
- **Orders with a PDF** have **Download PDF** and **Remake PDF**. Remake rebuilds it from the order as it is now (for example after a name correction), with the same codes.
- **Not available:** for unpaid, refunded or cancelled orders (403 for anyone without admin ticket rights, 409 when the order isn't paid).
- **Content:** one A4 page per ticket:
  - the VersaTalent logo;
  - the event name, date and start time (UK time), and venue;
  - the buyer's full name and order reference;
  - the ticket type and "Ticket 2 of 4";
  - the QR code (at least 50 mm wide) with the code printed underneath;
  - the line "Show this code at the door. It admits one person, once.";
  - the ticket terms link (`/tickets/terms`).
- **Storage:** private, with the existing document storage (`saveDocumentFile` / `readDocumentFile`, Netlify Blobs; a local folder in tests). The key is `tickets/<order id>.pdf`.
- **File name:** `VersaTalent-<event title>-<order reference>.pdf`, served `private, no-store`.
- **Libraries:** `pdf-lib` (makes the PDF) and `qrcode` (draws the QR as a PNG) on the server.

## At the door (Staff → Event day → event)

Who: anyone signed in as staff or admin, as for card check-in today. Every action needs the event to be today (or check-ins switched on for it, as now).

**Scan ticket.** A button opens the device's camera, using `qr-scanner` in the browser; it works on Android and iPhone. Each code read goes to `POST /api/staff/event-day/<eventId>/tickets/admit` `{ code }`. The page shows a large result with the existing beep, and ignores the same code read again within 3 seconds.

| Result | Shown |
|---|---|
| Admitted | ✅ "Admitted: <full name> · <ticket type> · <n> of <quantity> from this order in" |
| Already used | ⚠️ "Already used at 21:14 (QR, by Ana)" |
| Other event | ❌ "This ticket is for <event title>" |
| Refunded / cancelled | ❌ "This ticket's order was refunded" / "…cancelled" |
| Unknown | ❌ "Not a VersaTalent ticket" |

**VIP card tap (existing check-in, extended).** For an event that sells tickets on the website (it has at least one ticket type):
- **The member's tickets:** tickets on paid orders for this event that are linked to the member (`member_user_id`) or bought with their account's email (case-insensitive). If those orders have no ticket rows yet, they're created on the spot; the PDF isn't needed for that.
- **One unused:** it's admitted (`via 'card'`) and their check-in points are given as today. The result shows the ticket as for a scan.
- **All used:** "Already in" (no new points, as today).
- **None:** ❌ "No ticket for this event", with no check-in and no points. The scan is logged as an error.

For an event that doesn't sell tickets on the website, card check-in is unchanged.

**Find a ticket.** A search box (name, email or order reference; at least 2 characters) lists this event's paid orders that match, each with its tickets. Each ticket shows a number, a type, and Admit, or "In at 21:14" with Undo. Admitting by hand is `via 'manual'`. Orders without ticket rows get them when a ticket is first admitted.

**Undo.** `POST …/tickets/<id>/undo` clears the admission (for example after scanning the wrong person). It doesn't take back check-in points; the points are per member per event, as now.

**Admin door list.** It shows "<in> of <quantity> in" per order. Ticking an order admits all its remaining tickets (`via 'manual'`); unticking undoes all of them.

## Code

- `migrations/045_door_tickets.sql`
- `src/lib/tickets/codes.ts`: `newTicketCode()`, `isTicketCode(text)`
- `src/lib/db/repositories/door-tickets.ts`:
  - `ensureOrderTickets(orderId)`
  - `admitByCode(eventId, code, actor)`
  - `admitTicket(ticketId, eventId, actor, via)`
  - `undoTicket(ticketId, eventId)`
  - `memberTicketsForEvent(eventId, userId)`
  - `searchDoorOrders(eventId, q)`
  - `setOrderArrived` (rewritten on top of tickets)
- `src/lib/tickets/pdf.ts`: `buildTicketPdf(order, event, tickets): Promise<Uint8Array>`
- **Routes:**
  - `POST /api/admin/tickets/orders/[id]/pdf` (create or remake);
  - `GET /api/admin/tickets/orders/[id]/pdf` (download);
  - `POST /api/staff/event-day/[eventId]/tickets/admit`;
  - `GET /api/staff/event-day/[eventId]/tickets?q=`;
  - `POST /api/staff/event-day/[eventId]/tickets/[ticketId]/undo`;
  - the card check-in route gains the ticket rule.
- **Screens:** the PDF buttons on the orders list and door list in Admin → Tickets; on the event day page, "Scan ticket" (camera), "Find a ticket", and ticket counts next to the check-in stats ("Tickets in: 34 of 120").

## Tests (Playwright, `e2e/tests/door-tickets.spec.ts`)

- **Create PDF:**
  - a paid order of 3 makes 3 tickets with unique `VT-` codes, numbered by item;
  - the PDF has 3 pages, and each page's text includes its code and "Ticket n of 3";
  - Remake keeps the codes;
  - an unpaid order gets 409; a non-admin gets 403.
- **Scanning:**
  - a valid code → admitted, `arrived_at` set;
  - the same code again → already used, with the time;
  - another event's ticket → refused;
  - a ticket on a refunded order → refused;
  - garbage → "Not a VersaTalent ticket".
- **Card tap at a ticketed event:**
  - a member with a ticket → admitted (`via 'card'`) plus points;
  - a second tap → "Already in";
  - a member with no ticket → refused, no points, no check-in;
  - a ticket bought with the member's email but not linked → found.
- **Card tap at an event without ticket types:** unchanged (checked in plus points).
- **Search and admit:**
  - search by email, last name and reference finds the order;
  - admitting by hand → `via 'manual'`; Undo clears it, and `arrived_at` is cleared when none are in.
- **Admin door list:** ticking admits all remaining tickets; unticking undoes them.
- **Permissions:** a signed-out request to admit, search or download is refused.
- **Screen:** the event day page shows "Scan ticket" and "Find a ticket"; searching and pressing Admit shows the person as in. The camera itself isn't tested, so the scan result view is driven through the same admit call.

## Risks

- **Phones without a camera permission:** the scanner explains how to allow the camera, and staff can still use Find a ticket.
- **PDFs made before a refund:** the codes in them stop working when the order is refunded, which is intended.
- **A screenshot of a QR shared with a friend:** it still admits only once, so the second person is turned away with "Already used at …".
