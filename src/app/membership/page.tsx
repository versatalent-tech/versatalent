import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Gift, Nfc, Sparkles, Star } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MembershipForm } from '@/components/membership/MembershipForm';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';
import { getActiveTierBenefits } from '@/lib/db/repositories/vip-tier-benefits';
import { getTierSettings } from '@/lib/services/vip-tiers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VIP Membership | VersaTalent',
  description:
    'Join the VersaTalent VIP programme: a free NFC membership card, points at every event, and Silver, Gold and Black tier rewards.',
};

const TIERS = [
  { key: 'silver', name: 'Silver', style: 'from-gray-200 to-gray-400 text-gray-900' },
  { key: 'gold', name: 'Gold', style: 'from-yellow-200 to-amber-500 text-gray-900' },
  { key: 'black', name: 'Black', style: 'from-gray-800 to-black text-white' },
] as const;

export default async function MembershipPage() {
  const [settings, tiers, benefits] = await Promise.all([getProgrammeSettings(), getTierSettings(), getActiveTierBenefits()]);
  const fee = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(settings.card_delivery_fee_cents / 100);
  const threshold = { silver: 0, gold: tiers.thresholds.gold, black: tiers.thresholds.black };

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-16 text-white md:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p className="mb-3 text-sm uppercase tracking-widest text-gold">VersaTalent VIP</p>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Your card. Your points. <span className="text-gold">Your nights.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Join free and get a VersaTalent NFC membership card posted to your door. Tap in at our events to collect points,
            move up through Silver, Gold and Black, and unlock member perks.
          </p>
          {settings.signup_open && (
            <a href="#join" className="mt-8 inline-block rounded-md bg-gold px-8 py-3 font-semibold text-black hover:bg-gold/90">
              Join now
            </a>
          )}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-3">
          {[
            { icon: CreditCard, title: 'Apply online', text: `Free membership. Just ${fee} to post your card to you.` },
            { icon: Nfc, title: 'Tap in at events', text: 'Staff scan your card at the door, and you collect points every time you come.' },
            { icon: Gift, title: 'Move up and save', text: 'Points lift you to Gold and Black for member discounts at our bars.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center">
              <Icon className="mx-auto mb-3 h-10 w-10 text-gold" />
              <h2 className="mb-1 text-lg font-semibold">{title}</h2>
              <p className="text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-14">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-2 text-center text-3xl font-bold">The tiers</h2>
          <p className="mb-8 text-center text-gray-600">
            Everyone starts on Silver. Points you earn in your membership year move you up.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {TIERS.map((tier) => {
              const discount = tiers.discounts[tier.key];
              const list = benefits.filter((b) => b.tier_name === tier.key);
              return (
                <div key={tier.key} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className={`bg-gradient-to-br ${tier.style} p-5`}>
                    <p className="text-2xl font-bold">{tier.name}</p>
                    <p className="text-sm opacity-80">
                      {threshold[tier.key] === 0 ? 'From day one' : `${threshold[tier.key].toLocaleString('en-GB')} points in a year`}
                    </p>
                  </div>
                  <ul className="space-y-2 p-5 text-sm">
                    {discount > 0 && (
                      <li className="flex gap-2">
                        <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                        {discount}% off eligible drinks and items at our events
                      </li>
                    )}
                    {tiers.multipliers[tier.key] > 1 && (
                      <li className="flex gap-2">
                        <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                        {tiers.multipliers[tier.key]}× points
                      </li>
                    )}
                    {list.map((b) => (
                      <li key={b.id} className="flex gap-2">
                        <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                        <span>
                          {b.title}
                          {b.description ? <span className="text-gray-500"> · {b.description}</span> : null}
                        </span>
                      </li>
                    ))}
                    {discount === 0 && list.length === 0 && <li className="text-gray-500">Collect points from your first event.</li>}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-gold/40 bg-white p-5">
            <Sparkles className="mt-0.5 h-6 w-6 flex-shrink-0 text-gold" />
            <div>
              <p className="font-semibold">Coming soon: V•PRIVILEGE Founding Membership, £29.99 a year</p>
              <p className="text-sm text-gray-600">
                Extra member benefits for our earliest supporters. Tick the box when you join to hear first. It&apos;s separate
                from your tier, which you always earn through points.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="join" className="scroll-mt-24 bg-white py-14">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="mb-2 text-3xl font-bold">Join the programme</h2>
          {settings.signup_open ? (
            <>
              <p className="mb-8 text-gray-600">
                Takes two minutes. Your card is usually posted within 5 working days of payment.
              </p>
              <MembershipForm feeCents={settings.card_delivery_fee_cents} />
            </>
          ) : (
            <p className="rounded-lg border bg-gray-50 p-6 text-gray-700">
              Applications open soon. Follow us on Instagram or{' '}
              <Link href="/contact" className="text-gold underline">
                get in touch
              </Link>{' '}
              to hear when they do.
            </p>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
