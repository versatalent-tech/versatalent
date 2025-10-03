"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <body className="antialiased" suppressHydrationWarning>
      <AuthProvider>
        {children}
      </AuthProvider>
    </body>
  );
}
