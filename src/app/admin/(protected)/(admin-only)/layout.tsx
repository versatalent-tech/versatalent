import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';

/**
 * Admin-only sections: talents, events, content, NFC, VIP, POS, team.
 * Managers and road managers are sent back to their dashboard.
 */
export default async function AdminOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTeamSession();

  if (!session) {
    redirect('/admin/login');
  }
  if (session.role !== 'admin') {
    redirect('/admin');
  }

  return children;
}
