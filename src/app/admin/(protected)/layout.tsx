import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';

/**
 * Server-side guard for every admin page except /admin/login: any team role
 * (admin, manager, road manager) may enter. Sections only admins may use sit
 * in the (admin-only) group, which has its own stricter guard.
 *
 * Done in a layout rather than middleware.ts because Next's edge middleware
 * crashes on Netlify ("snapshot is not a function"). API routes enforce
 * their own auth; this only guards the page shells.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTeamSession();

  if (!session) {
    redirect('/admin/login');
  }

  return children;
}
