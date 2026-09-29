import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { STAFF_SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Server-side guard for the staff POS (see admin/(protected)/layout.tsx for
 * why this isn't in middleware.ts).
 */
export default async function StaffPOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(STAFF_SESSION_COOKIE)?.value);

  if (!session) {
    redirect('/staff/login');
  }

  return children;
}
