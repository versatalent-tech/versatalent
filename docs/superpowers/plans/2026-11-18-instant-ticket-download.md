# Instant Ticket Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As soon as a buyer has paid, they can download their PDF tickets from their private order page, and the page tells them the tickets will also be emailed.

**Architecture:** A shared helper builds and stores an order's PDF, or returns the stored one. Two routes use it: the admin route (unchanged behaviour) and a new buyer route that checks the private link token. The order page gets a download link and the email message.

**Tech Stack:** Next.js App Router, Neon (`sql`), pdf-lib (`buildTicketPdf`), Netlify Blobs (`document-storage`), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-18-instant-ticket-download-design.md`

## Global Constraints
- The copy is fixed: button **"Download your tickets (PDF)"**. The message is *"We'll also email your tickets to {email} within 24 hours. Keep this page or the PDF handy: we scan the QR code at the door."*
- The buyer route reveals nothing without a valid token: a wrong token or unknown id returns 404, the same as the order API.
- The PDF must be the same file the admin makes. The stored key stays `tickets/{orderId}.pdf`.

## Review Focus
- **Buyer downloads before the admin makes the PDF, then the admin presses "Create PDF":** the admin remakes it and the QR codes are unchanged, because `ensureOrderTickets` is idempotent. Test: same ticket codes after both.
- **Stored blob missing while `pdf_key` is set:** the buyer route remakes the PDF instead of returning 404. Test: clear the blob (local file) and expect 200.
- **Refunded or cancelled order with a valid token:** 409, and no PDF. Test in Task 1.
- **Double click or two tabs:** both downloads succeed and the tickets aren't duplicated. Test: two parallel GETs give the same ticket count.
- **Free (0p) order marked paid:** downloads like any other. Already covered by `paidOrder`, which has no price dependency.

---

### Task 1: Shared PDF helper + buyer download route

**Files:**
- Create: `src/lib/tickets/order-pdf.ts`
- Modify: `src/app/api/admin/tickets/orders/[id]/pdf/route.ts` (use the helper; drop the local `loadLogo`/`pdfResponse`)
- Create: `src/app/api/tickets/orders/[id]/pdf/route.ts`
- Test: `e2e/tests/ticket-download.spec.ts`

**Interfaces:**
- Produces:
  - `makeOrderPdf(order: PdfOrder, origin: string): Promise<Uint8Array>`: ensures the tickets, builds the PDF, saves it to `tickets/{id}.pdf` and calls `setOrderPdf`.
  - `storedOrderPdf(order: PdfOrder): Promise<Uint8Array | ArrayBuffer | null>`: reads the stored PDF.
  - `ticketPdfResponse(order: PdfOrder, bytes): NextResponse`: the same headers and filename as today.
- Consumes: `getOrderWithToken(id, token)` from `tickets.ts`, and `getPdfOrder` from `door-tickets.ts`.

- [ ] **Step 1: Write the failing tests** in `e2e/tests/ticket-download.spec.ts` (token from `SELECT access_token FROM ticket_orders`):
  - `right link downloads the PDF`: GET `/api/tickets/orders/{id}/pdf?k={token}` returns 200 with `content-type` `application/pdf`. The page count equals the tickets plus 1, as in door-tickets.spec. `pdf_key = tickets/{id}.pdf`.
  - `wrong link or unpaid order is refused`: a bad token returns 404. `paidOrder(..., { status: 'pending' })` with its token returns 409.
  - `second download is the same file, tickets not duplicated`: two parallel GETs both return 200. `SELECT count(*) FROM door_tickets WHERE order_id` equals the quantity, and `pdf_created_at` is unchanged on a third GET.
  - `admin remake keeps the same QR codes`: the codes before and after the admin POST are equal.
  - `missing stored file is remade`: delete `.private-uploads/documents/{id}.pdf`, then GET returns 200.
  - `then shows in the confirmation queue with a PDF`: `has_pdf` is true in `/api/admin/messages?queue=confirmation&event=…`.
- [ ] **Step 2:** `npm run test:e2e -- ticket-download`. Expected: FAIL (404 route).
- [ ] **Step 3:** Implement the helper and the routes. Buyer GET: get the token from `k`. `getOrderWithToken` → null gives 404. `getPdfOrder`; status not `paid` gives 409 `"Your tickets are ready once payment is confirmed"`. Use the stored PDF if it exists, else `makeOrderPdf`. Origin is `request.nextUrl.origin`.
- [ ] **Step 4:** Run the tests again plus `door-tickets`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: buyers can download their ticket PDF from their order page link`.

### Task 2: Order page download link + email message

**Files:**
- Modify: `src/app/tickets/order/[id]/page.tsx` (the paid branch)
- Test: `e2e/tests/ticket-download.spec.ts`

**Interfaces:**
- Consumes: `GET /api/tickets/orders/{id}/pdf?k={token}` (Task 1), and `order.email` from `PublicOrder`.

- [ ] **Step 1: Write the failing test** `order page shows the download and the email message`: visit `/tickets/order/{id}?k={token}`. The link "Download your tickets (PDF)" has `href` ending `/pdf?k={token}`. Clicking it starts a download whose filename ends `{reference}.pdf`. The text contains `We'll also email your tickets to {email} within 24 hours`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** In the paid branch, replace the "give your name or show this page" sentence with the fixed message. Add a gold `<a download>` button (`Download` icon) above the summary.
- [ ] **Step 4:** Run `ticket-download`, `tickets`, `ticket-membership` and `customer-messages`, plus `tsc --noEmit` and ESLint. Expected: all pass.
- [ ] **Step 5:** Commit `feat: download button and email message on the order page`.
