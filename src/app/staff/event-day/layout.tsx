import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/middleware/auth';

/**
 * Server-side guard for the event-day door pages. Staff and admins can both
 * run the door, so either session is accepted (see staff/pos/layout.tsx).
 */
export default async function EventDayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/staff/login');
  }

  return children;
}
