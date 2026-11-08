import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Talent Portal | VersaTalent',
  robots: { index: false, follow: false },
  // Lets talents add the portal to their Home Screen (needed for iPhone notifications)
  manifest: '/portal.webmanifest',
  appleWebApp: { capable: true, title: 'VersaTalent', statusBarStyle: 'black' },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
