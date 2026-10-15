import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TicketPurchase } from '@/components/tickets/TicketPurchase';
import { getPublicTicketEvent } from '@/lib/db/repositories/tickets';
import { getPointRuleByActionType } from '@/lib/db/repositories/vip-point-rules';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicTicketEvent(id).catch(() => null);
  return { title: event ? `Tickets: ${event.title} | VersaTalent` : 'Tickets | VersaTalent' };
}

export default async function EventTicketsPage({ params }: Props) {
  const { id } = await params;
  const [event, rule] = await Promise.all([getPublicTicketEvent(id), getPointRuleByActionType('ticket_purchase').catch(() => null)]);
  if (!event) notFound();
  const perPound = rule ? Number(rule.points_per_unit) : 0;
  const poundsPerPoint = perPound > 0 ? Math.round((1 / perPound) * 100) / 100 : null;
  const when = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.starts_at));

  return (
    <MainLayout>
      <section className="bg-white py-10 md:py-14">
        <div className="container mx-auto max-w-3xl px-4">
          <Link href={`/events/${event.id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gold">
            <ArrowLeft className="h-4 w-4" /> Back to the event
          </Link>
          <h1 className="text-3xl font-bold md:text-4xl">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" /> {when}
            </span>
            {event.venue && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" /> {event.venue}
              </span>
            )}
          </div>
          <div className="mt-8">
            <TicketPurchase event={event} poundsPerPoint={poundsPerPoint} />
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
