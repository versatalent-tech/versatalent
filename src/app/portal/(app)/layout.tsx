import { redirect } from 'next/navigation';
import { getTalentSession } from '@/lib/auth/talent-auth';
import { PortalShell } from '@/components/portal/PortalShell';

/** Signed-in talents only */
export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const talent = await getTalentSession();
  if (!talent) redirect('/portal/login');
  return <PortalShell talentName={talent.talentName}>{children}</PortalShell>;
}
