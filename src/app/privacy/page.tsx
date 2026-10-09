import type { Metadata } from 'next';
import { LegalPage } from '@/components/membership/LegalPage';

export const metadata: Metadata = { title: 'Privacy Notice | VersaTalent' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" updated="October 2026">
      <p>
        This notice explains how VersaTalent (&quot;we&quot;, &quot;us&quot;) uses personal information when you join our VIP
        programme, come to our events, buy from our bars and tills, or contact us. We are the controller of this information.
        Questions or requests: <a href="mailto:versatalent.management@gmail.com" className="text-gold underline">versatalent.management@gmail.com</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Membership details:</strong> name, email, mobile number, date of birth, postal address, interests, how you heard about us, and your marketing choices.</li>
        <li><strong>Card and activity:</strong> your NFC card&apos;s identifier, event check-ins, purchases made with your card at our tills, points, tier and discounts applied.</li>
        <li><strong>Payments:</strong> when you pay online, SumUp processes your card. We receive a payment reference and outcome, never your card details.</li>
        <li><strong>Messages:</strong> anything you send through our website forms or by email.</li>
      </ul>

      <h2>Why we use it, and our lawful basis</h2>
      <ul>
        <li><strong>To run your membership</strong> (posting your card, recognising you at events, points, tiers and discounts): to perform our contract with you.</li>
        <li><strong>To check you&apos;re 18 or over</strong>, and to keep records we&apos;re required to keep (for example payment records for tax): legal obligation.</li>
        <li><strong>To prevent fraud and misuse, keep our systems secure and improve the programme</strong>: our legitimate interests.</li>
        <li><strong>To send you news and offers</strong> by email, text or post: only with your consent for each channel, which you can withdraw at any time.</li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>Service providers who run our systems for us under contract: Netlify (website hosting), Neon (database hosting) and SumUp (payments).</li>
        <li>Postal services, which see the name and address on your card&apos;s envelope.</li>
        <li>Authorities, where the law requires it.</li>
      </ul>
      <p>We don&apos;t sell your information.</p>

      <h2>International transfers</h2>
      <p>
        Our database is hosted in the United States. Where information is transferred outside the UK, our providers use safeguards
        approved under UK data protection law, such as the International Data Transfer Addendum or equivalent contractual terms.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Membership and activity records: while you&apos;re a member, then up to 2 years after your membership ends.</li>
        <li>Payment and sales records: 6 years, for tax and accounting.</li>
        <li>Applications that are never paid for: up to 6 months.</li>
        <li>Marketing choices: until you change them.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete your information, to restrict or object to how we use it, or to receive a copy to
        take elsewhere. You can withdraw marketing consent at any time. Email us and we&apos;ll respond within one month. If
        you&apos;re unhappy, you can complain to the Information Commissioner&apos;s Office at{' '}
        <a href="https://ico.org.uk" className="text-gold underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        We don&apos;t use our own advertising or tracking cookies. Sign-in areas for our team, staff and talents use essential cookies
        to keep you signed in. Some talent and blog pages show videos or posts embedded from services such as YouTube and
        Instagram, which may set their own cookies under their privacy policies.
      </p>
    </LegalPage>
  );
}
