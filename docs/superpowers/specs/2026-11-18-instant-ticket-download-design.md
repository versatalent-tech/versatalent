# Instant ticket download — design

## Why
Buyers shouldn't have to wait for us to email their tickets. As soon as they've paid, they can download the PDF (one QR code per ticket) from their order page. The email still goes out, sent by hand from Customer messages.

## Goals
- A paid order's page has **Download your tickets (PDF)**.
- The page says the tickets will also be emailed: *"We'll also email your tickets to {email} within 24 hours. Keep this page or the PDF handy: we scan the QR code at the door."* (This replaces "give your name or show this page".)
- The PDF is the same one the admin **Create PDF** makes, with the same QR codes.

## Non-goals
- Sending email automatically. There's no email provider; sending stays manual.
- Changing the PDF layout or the door scanning.

## Approaches
1. **Make the PDF on the buyer's first download (chosen).** The PDF is made and saved on that first click; later clicks serve the saved file.
2. Make it when payment confirms. Rejected: that runs while SumUp is still confirming, and a slow or failed PDF could hold up or break it.
3. Make it in the browser. Rejected: the QR codes have to come from the server so they match what we scan.

## Design
- `GET /api/tickets/orders/[id]/pdf?k=<token>`: checks the private link token (`getOrderWithToken`). Only paid orders get a PDF. It serves the stored PDF if there is one; otherwise it makes it, stores it (`setOrderPdf`) and serves it.
- One shared helper, `makeOrderPdf(orderId, origin)`, holds the logo loading and the build-and-store step, used by both the admin route and the buyer route. The response headers are shared too.
- Once the PDF is made, the order shows **Download PDF** in Customer messages → Ticket confirmations. If the buyer never downloads, the admin **Create PDF** works as before.
- Tests:
  - download works with the right link
  - refused with a wrong link
  - refused for an unpaid order
  - the second download gives the same file
  - the order then shows as having a PDF in the confirmation queue
  - the order page shows the button and the message

## Left to the builder
The button's exact placement and styling on the order page, in keeping with the current gold buttons.

## Addendum: ticket design and keeping PDFs current
- The PDF uses the VersaTalent ticket design (`src/lib/tickets/template/ticket-template.pdf`), supplied on 2026-11-18. The template's form fields mark where each detail goes. The two LOGO boxes get the V logo: dark on the light header, white on the black panel. The QR code goes in the reserved box, with its code underneath, one page per ticket.
- Doors open shows the event's start time, because events have no separate doors time.
- `scripts/build-ticket-assets.mjs` turns the template and logo into `template/assets.ts`, so the functions don't read files at runtime. Run it after changing either.
- A stored PDF is made again when the event was edited after it was made, or when it's on an older design (`DESIGN_VERSION` in `order-pdf.ts`, which goes into the stored file name). The QR codes never change.
