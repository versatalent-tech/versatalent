import type { Metadata } from "next";

// The one-time token is in the URL: keep it out of search results and Referer headers
export const metadata: Metadata = {
  title: "Account setup | VersaTalent",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountSetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
