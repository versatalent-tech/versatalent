import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';

/** Bookings calendar: admins, managers and road managers */
export default async function BookingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getTeamSession();
  if (!session) redirect('/admin/login');
  if (!can(session.role, 'bookings.view')) redirect('/admin');
  return children;
}
