"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function AccountSetupForm() {
  const token = useSearchParams().get("token") ?? "";
  const [checking, setChecking] = useState(true);
  const [link, setLink] = useState<{ name: string; purpose: "invite" | "reset" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signInPath, setSignInPath] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(`/api/account/setup?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const body = await response.json();
        if (body.success) setLink(body.data);
        else setError(body.error);
      } catch {
        setError("Couldn’t check this link. Please try again.");
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don’t match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();
      if (body.success) setSignInPath(body.data.signInPath);
      else setError(body.error);
    } catch {
      setError("Couldn’t save your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
            <KeyRound className="h-6 w-6 text-gold" />
          </div>
        </div>
        <CardTitle className="text-center text-2xl">
          {link?.purpose === "reset" ? "Reset your password" : "Set up your account"}
        </CardTitle>
        {link && (
          <CardDescription className="text-center">
            {link.purpose === "reset" ? `Choose a new password, ${link.name}.` : `Welcome, ${link.name}. Choose a password to finish.`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {checking ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : signInPath ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Password saved.
            </div>
            <Button asChild className="w-full bg-gold text-white hover:bg-gold/90">
              <Link href={signInPath}>Sign in</Link>
            </Button>
          </div>
        ) : !link ? (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-gray-500">At least 8 characters, with an uppercase letter, a lowercase letter and a number.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gold text-white hover:bg-gold/90" disabled={saving}>
              {saving ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountSetupPage() {
  return (
    <SimpleMainLayout>
      <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 py-12">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-gold" />}>
          <AccountSetupForm />
        </Suspense>
      </section>
    </SimpleMainLayout>
  );
}
