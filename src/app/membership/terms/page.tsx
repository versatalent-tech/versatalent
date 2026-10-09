import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/membership/LegalPage';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';
import { getTierSettings } from '@/lib/services/vip-tiers';
import { getActivePointRules } from '@/lib/db/repositories/vip-point-rules';
import { getFoundingSettings } from '@/lib/db/repositories/founding';
import { getReferralConfig } from '@/lib/db/repositories/referrals';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'VIP Membership Terms | VersaTalent' };

export default async function MembershipTermsPage() {
  const [settings, tiers, rules, founding, referrals] = await Promise.all([
    getProgrammeSettings(),
    getTierSettings(),
    getActivePointRules(),
    getFoundingSettings(),
    getReferralConfig(),
  ]);
  const minOrder = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(referrals.settings.min_order_cents / 100);
  const foundingPrice = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(founding.founding_price_cents / 100);
  const fee = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(settings.card_delivery_fee_cents / 100);
  const checkin = rules.find((r) => r.action_type === 'event_checkin')?.points_per_unit ?? 10;
  const perPound = rules.find((r) => r.action_type === 'consumption')?.points_per_unit ?? 1 / 3;
  const poundsPerPoint = Math.round(1 / perPound);

  return (
    <LegalPage title="VersaTalent VIP Membership Terms" updated="October 2026">
      <p>
        These terms explain how the VersaTalent VIP programme works. By joining you agree to them. They don&apos;t affect your
        legal rights as a consumer.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The programme is run by VersaTalent (&quot;we&quot;, &quot;us&quot;). Contact us at{' '}
        <a href="mailto:versatalent.management@gmail.com" className="text-gold underline">versatalent.management@gmail.com</a>.
      </p>

      <h2>2. Joining</h2>
      <ul>
        <li>You must be 18 or over and have a UK postal address.</li>
        <li>One membership per person. The details you give must be accurate and your own.</li>
        <li>Membership of the programme is free. We may decline or close an application, for example if details can&apos;t be verified.</li>
      </ul>

      <h2>3. Your card and delivery</h2>
      <ul>
        <li>Your VersaTalent NFC card is free. You pay {fee} towards postage and packaging when you apply.</li>
        <li>We aim to post your card within 5 working days of payment. Your membership starts when the payment is confirmed.</li>
        <li>
          Changed your mind? Tell us within 14 days of paying and we&apos;ll refund the delivery fee in full, whether or not the card
          has been posted.
        </li>
        <li>
          The card is personal to you and can&apos;t be transferred. If it&apos;s lost, stolen or damaged, tell us straight away so we
          can block it. A replacement may need a new delivery fee.
        </li>
      </ul>

      <h2>4. Collecting points</h2>
      <ul>
        <li>
          You earn {checkin} points when staff check you in at a VersaTalent event (once per event), and 1 point for every £
          {poundsPerPoint} you spend on eligible items at our bars and tills, based on what you actually pay after any discount.
        </li>
        <li>Tapping your card on your own phone doesn&apos;t earn points: check-ins are done by our staff.</li>
        <li>Gold and Black members earn points faster: {tiers.multipliers.gold}× and {tiers.multipliers.black}× respectively.</li>
        <li>
          Points have no cash value and can&apos;t be sold or transferred. We may correct points added by mistake, or remove points
          linked to refunds, cancelled purchases or misuse.
        </li>
      </ul>

      <h2>5. Tiers</h2>
      <ul>
        <li>
          Everyone starts on Silver. Reach {tiers.thresholds.gold.toLocaleString('en-GB')} points in a membership year for Gold and{' '}
          {tiers.thresholds.black.toLocaleString('en-GB')} for Black. Your membership year runs from the date you joined.
        </li>
        <li>When you move up, you keep that tier for the rest of that year and the whole of the next.</li>
        <li>
          At the end of each year your tier is reviewed against the points you earned that year. If you don&apos;t requalify, you drop
          by no more than one tier at a time.
        </li>
      </ul>

      <h2>6. Member discounts and benefits</h2>
      <ul>
        <li>
          Your tier&apos;s discount (currently Silver {tiers.discounts.silver}%, Gold {tiers.discounts.gold}%, Black{' '}
          {tiers.discounts.black}%) applies to eligible items when you show your card at the till. Some products are excluded, and
          discounts can&apos;t be combined with other offers unless we say so.
        </li>
        <li>
          Current tier benefits are listed on the{' '}
          <Link href="/membership" className="text-gold underline">membership page</Link>. Event-based benefits are subject to
          availability and venue rules, including age and ID checks.
        </li>
      </ul>

      <h2>7. Changes to the programme</h2>
      <p>
        We may change how points are earned, tier levels, discounts or benefits. We&apos;ll publish changes on the membership page and
        give at least 30 days&apos; notice of changes that reduce your benefits, unless a change is needed sooner for legal, security or
        fraud reasons. Points and tiers already earned won&apos;t be taken away because of a change.
      </p>

      <h2>8. Leaving or suspension</h2>
      <ul>
        <li>You can leave at any time by contacting us. Your points lapse when your membership ends.</li>
        <li>We may suspend or close a membership for misuse, fraud, abusive behaviour, or breach of these terms.</li>
        <li>If we ever close the programme, we&apos;ll give at least 30 days&apos; notice.</li>
      </ul>

      <h2 id="founding" className="scroll-mt-24">9. V•PRIVILEGE Founding Membership</h2>
      <p>
        The Founding Membership is an optional paid membership on top of the free programme.
        {founding.founding_on_sale ? '' : ' It isn’t on sale at the moment.'} These terms apply to it as well as sections 1 to 8.
      </p>
      <ul>
        <li>
          <strong>Price and term.</strong> {foundingPrice}, paid once, for 12 months from the date your payment is confirmed. The
          price and the full list of benefits are shown before you pay.
        </li>
        <li>
          <strong>No automatic renewal.</strong> We don&apos;t keep your card details and nothing is charged again. You can buy
          another year from 30 days before your membership ends; the new year starts when the current one ends.
        </li>
        <li>
          <strong>Separate from tiers.</strong> It doesn&apos;t change your tier, points or tier discount. If it ends, you keep your
          tier and points.
        </li>
        <li>
          <strong>Founding number and card.</strong> Founding Members get a number from a limited run of{' '}
          {founding.founding_cap.toLocaleString('en-GB')} and keep it if they renew. If you join as a Founding Member, card delivery
          is included and your card is posted to you. If you already have a card, your Founding benefits work on it straight away.
        </li>
        <li>
          <strong>Benefits.</strong> Benefits are subject to the limits shown with each one, to capacity and venue rules, and to age
          and ID checks; drinks benefits are for over-18s only. Benefits are personal and can&apos;t be transferred or exchanged for
          cash.
        </li>
        <li>
          <strong>Changes to benefits.</strong> We may change the benefits offered on future purchases. The benefits you bought are
          kept for your 12 months, unless a change is needed for legal, safety or venue reasons, in which case we&apos;ll offer a
          comparable alternative or a partial refund.
        </li>
        <li>
          <strong>Your right to cancel.</strong> You can cancel within 14 days of paying by contacting us. We&apos;ll refund what you
          paid, less a fair amount for any benefits you&apos;ve already used in that time (for example, the cost of a welcome
          drink). After 14 days, the membership isn&apos;t refundable except where the law requires it or we can&apos;t provide the
          benefits.
        </li>
        <li>
          <strong>When it ends.</strong> At the end of the 12 months, or if it&apos;s cancelled or refunded, the paid benefits stop.
          We may end a Founding Membership for misuse, fraud or abusive behaviour, as in section 8.
        </li>
      </ul>

      <h2 id="referrals" className="scroll-mt-24">10. Referring friends</h2>
      <ul>
        <li>
          When referrals are open, your member pass shows a personal code. If a friend joins with it and their first visit is
          confirmed (checked in by our staff at an event, or a purchase of at least {minOrder} at our till), you receive{' '}
          {referrals.settings.referrer_points} reward points
          {referrals.settings.referee_points > 0 ? ` and your friend receives ${referrals.settings.referee_points}` : ''}.
        </li>
        <li>
          Referral points are reward points only: they never count towards your tier. You can be rewarded for up to{' '}
          {referrals.settings.yearly_cap} referrals in 12 months.
        </li>
        <li>
          You can&apos;t refer yourself, and each person can only be referred once. We may check, delay or refuse a referral that
          looks like the same person or household signing up twice, or other misuse.
        </li>
      </ul>

      <h2>11. Your data</h2>
      <p>
        How we use your information is explained in our <Link href="/privacy" className="text-gold underline">privacy notice</Link>.
      </p>

      <h2>12. General</h2>
      <p>
        Nothing in these terms limits liability that can&apos;t legally be limited, or affects your statutory rights. These terms are
        governed by the law of England and Wales.
      </p>
    </LegalPage>
  );
}
