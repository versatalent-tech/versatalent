import { redirect } from 'next/navigation';

// The old talent dashboard address now leads to the talent portal
export default function DashboardPage() {
  redirect('/portal');
}
