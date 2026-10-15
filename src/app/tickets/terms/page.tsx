import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/membership/LegalPage';
import { HOLD_MINUTES } from '@/lib/tickets/types';

export const metadata: Metadata = { title: 'Ticket Terms | VersaTalent' };

export default function TicketTermsPage() {
  return (
    <LegalPage title="VersaTalent Ticket Terms" updated="October 2026">
      <p>
        These terms apply to tickets for VersaTalent events bought on our website. They don&apos;t affect your legal rights as a
        consumer.
      </p>

      <h2>1. Buying</h2>
      <ul>
        <li>You pay on SumUp&apos;s secure payment page. We never see your card details.</li>
        <li>
          Your tickets are held for {HOLD_MINUTES} minutes while you pay. Your order is confirmed when the payment is confirmed, and we
          show your order reference on screen.
        </li>
        <li>The details you give must be accurate. The name on the order is checked at the door.</li>
      </ul>

      <h2>2. At the event</h2>
      <ul>
        <li>Give the name on the order or show your order page at the door. Entry may need photo ID.</li>
        <li>Age limits, dress codes and the venue&apos;s conditions of entry apply. Entry can be refused for safety reasons.</li>
        <li>Tickets can&apos;t be resold for more than you paid.</li>
      </ul>

      <h2>3. Refunds and changes</h2>
      <ul>
        <li>
          Tickets for a specific date are not covered by the 14-day cancellation right, so they&apos;re non-refundable unless the event is
          cancelled.
        </li>
        <li>If we cancel an event, we refund the ticket price to the card you paid with. If we move it, you can keep your ticket or ask for a refund.</li>
        <li>Line-ups can change. A change of artist isn&apos;t a reason for a refund unless the event is substantially different.</li>
      </ul>

      <h2>4. Points for members</h2>
      <ul>
        <li>
          V•PRIVILEGE members earn points on tickets bought with the email on their membership, as set out in the{' '}
          <Link href="/membership/terms" className="text-gold underline">
            membership terms
          </Link>
          . Points are taken back if an order is refunded.
        </li>
      </ul>

      <h2>5. Your information</h2>
      <p>
        We use your details to run the event, check you in and, with your permission, tell you about future events. We also look at
        anonymised trends (for example where buyers heard about an event). See our{' '}
        <Link href="/privacy" className="text-gold underline">
          privacy notice
        </Link>
        .
      </p>

      <h2>6. Contact</h2>
      <p>
        <a href="mailto:versatalent.management@gmail.com" className="text-gold underline">
          versatalent.management@gmail.com
        </a>
      </p>
    </LegalPage>
  );
}
