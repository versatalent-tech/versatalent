import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/middleware/auth';
import { can } from '@/lib/auth/permissions';

/** CRM pages: admins and managers. Road managers go back to their dashboard. */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await getTeamSession();
  if (!session) redirect('/admin/login');
  if (!can(session.role, 'crm.view')) redirect('/admin');
  return children;
}
