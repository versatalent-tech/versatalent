import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';

/** Commission rates: admins only */
export default async function RatesLayout({ children }: { children: React.ReactNode }) {
  const session = await getTeamSession();
  if (!session) redirect('/admin/login');
  if (!can(session.role, 'rates.manage')) redirect('/admin/bookings');
  return children;
}
