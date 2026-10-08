"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Sign-in failed");
      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl bg-white p-6 shadow-xl">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/versatalent-new-logo.png" alt="VersaTalent" className="mx-auto mb-4 h-10" />
          <h1 className="text-2xl font-bold">
            Talent <span className="text-gold">Portal</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your bookings, earnings and rewards</p>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Password</span>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold/90">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
        <p className="text-center text-xs text-gray-500">
          First time, or forgotten your password? Ask your VersaTalent manager for a sign-in link.
        </p>
      </form>
    </div>
  );
}
