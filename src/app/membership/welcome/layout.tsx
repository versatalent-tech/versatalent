import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome | VersaTalent VIP',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
