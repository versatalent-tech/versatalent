import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';

/** Talent payouts: admins (everyone) and managers (their talents) */
export default async function PayoutsLayout({ children }: { children: React.ReactNode }) {
  const session = await getTeamSession();
  if (!session) redirect('/admin/login');
  if (!can(session.role, 'payouts.manage')) redirect('/admin/bookings');
  return children;
}
