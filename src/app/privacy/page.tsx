import type { Metadata } from 'next';
import { LegalPage } from '@/components/membership/LegalPage';

export const metadata: Metadata = { title: 'Privacy Notice | VersaTalent' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" updated="October 2026">
      <p>
        This notice explains how VersaTalent (&quot;we&quot;, &quot;us&quot;) uses personal information when you join our VIP
        programme, buy tickets, come to our events, buy from our bars and tills, or contact us. We are the controller of this information.
        Questions or requests: <a href="mailto:versatalent.management@gmail.com" className="text-gold underline">versatalent.management@gmail.com</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Membership details:</strong> name, email, mobile number, date of birth, postal address, interests, how you heard about us, and your marketing choices.</li>
        <li><strong>Card and activity:</strong> your NFC card&apos;s identifier, event check-ins, purchases made with your card at our tills, points, tier and discounts applied.</li>
        <li><strong>Ticket orders:</strong> your name, email, Instagram username, and if you choose to give them, your phone number, town or city, age range and how you heard about the event; what you bought; and where the order came from (for example the link or campaign you followed).</li>
        <li><strong>Payments:</strong> when you pay online, SumUp processes your card. We receive a payment reference and outcome, never your card details.</li>
        <li><strong>Messages:</strong> anything you send through our website forms or by email.</li>
        <li><strong>Referrals:</strong> if you join with a friend&apos;s code, we record that they referred you. They see how many friends joined and came to an event, not who.</li>
        <li><strong>Talents&apos; connected Instagram accounts:</strong> if a talent we represent connects their Instagram professional account, we receive their username, profile picture, follower count, their posts and reels from the last 90 days with each one&apos;s caption, and the figures Instagram provides for them (views, reach, likes, comments, saves, shares, follows and profile visits). We never ask for, and can&apos;t access, their messages or the text of comments, and we can&apos;t post anything.</li>
      </ul>

      <h2>Why we use it, and our lawful basis</h2>
      <ul>
        <li><strong>To run your membership</strong> (posting your card, recognising you at events, points, tiers and discounts): to perform our contract with you.</li>
        <li><strong>To sell you tickets and check you in at the door</strong>: to perform our contract with you.</li>
        <li><strong>To understand who comes to our events and which promotion works</strong> (for example how many buyers heard about an event on Instagram, or come back for another), and to look up the Instagram username you gave us so we can tag or credit you: our legitimate interests.</li>
        <li><strong>To check you&apos;re 18 or over</strong>, and to keep records we&apos;re required to keep (for example payment records for tax): legal obligation.</li>
        <li><strong>To prevent fraud and misuse, keep our systems secure and improve the programme</strong>: our legitimate interests.</li>
        <li><strong>To see how our talents&apos; Instagram posts perform</strong> and plan content and bookings with them: the talent&apos;s consent, given when they connect, which they can withdraw at any time by disconnecting in their portal or removing our access in Instagram.</li>
        <li><strong>To send you news and offers</strong> by email, text or post: only with your consent for each channel, which you can withdraw at any time.</li>
        <li><strong>To tell you about something you&apos;ve paid for</strong>, such as your Founding Membership ending: to perform our contract with you.</li>
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
        <li>Ticket orders: 2 years after the event for the buyer&apos;s details; unpaid orders up to 6 months; payment records 6 years.</li>
        <li>Marketing choices: until you change them.</li>
        <li>Connected Instagram accounts: the access is deleted as soon as the account is disconnected; figures already collected are kept while we represent the talent, and deleted straight away if they ask us or Meta to delete their data.</li>
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
        to keep you signed in. Our homepage, talent and blog pages show videos or posts embedded from services such as YouTube and
        Instagram, which may set their own cookies under their privacy policies. Instagram posts only load as you scroll to them.
      </p>
    </LegalPage>
  );
}
