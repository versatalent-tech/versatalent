import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Server-side guard for every admin page except /admin/login.
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
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (session?.role !== 'admin') {
    redirect('/admin/login');
  }

  return children;
}
