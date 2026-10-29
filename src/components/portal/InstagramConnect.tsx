"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Instagram, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/components/crm/shared";
import { takeConnectResult } from "@/lib/instagram/messages";
import type { InstagramAccountSummary } from "@/lib/db/repositories/instagram-accounts";

interface Connection {
  configured: boolean;
  account: InstagramAccountSummary | null;
}

/** What connecting shares, and what it never does: shown before and after connecting */
function WhatWeSee() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 text-sm">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="font-medium mb-1">What the team can see</p>
        <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
          <li>Your username, profile picture and follower count</li>
          <li>Your posts and reels from the last 90 days</li>
          <li>Their figures: views, reach, likes, comments, saves, shares</li>
        </ul>
      </div>
      <div className="rounded-lg bg-green-50 p-3">
        <p className="font-medium mb-1 flex items-center gap-1 text-green-900">
          <ShieldCheck className="h-4 w-4" /> What we can never do
        </p>
        <ul className="list-disc pl-4 space-y-0.5 text-green-900">
          <li>See or access your messages</li>
          <li>Read your comments</li>
          <li>Post, edit or delete anything</li>
        </ul>
      </div>
    </div>
  );
}

/** Portal: connect, check and disconnect the talent's Instagram account */
export function InstagramConnect() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setMessage(takeConnectResult());
    api<Connection>("/api/portal/instagram")
      .then(setConnection)
      .catch((err) => setMessage({ ok: false, text: errorMessage(err) }));
  }, []);

  const disconnect = async () => {
    if (!window.confirm("Disconnect Instagram? The team stops getting new figures straight away.")) return;
    setBusy(true);
    setMessage(null);
    try {
      setConnection(await api<Connection>("/api/portal/instagram", { method: "DELETE" }));
      setMessage({ ok: true, text: "Disconnected. Our access has been deleted." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!connection) return null;
  const account = connection.account;
  const connected = account?.status === "connected";

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4" aria-labelledby="instagram-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="instagram-heading" className="font-semibold flex items-center gap-2">
          <Instagram className="h-5 w-5 text-gold" /> Instagram
        </h2>
        {connected && (
          <span className="flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Connected as @{account.username}
          </span>
        )}
      </div>

      {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}

      {!connection.configured ? (
        <p className="text-sm text-gray-500">Connecting Instagram isn&apos;t switched on yet. The team will let you know.</p>
      ) : connected ? (
        <>
          <p className="text-sm text-gray-600">
            {account.followers_count !== null && <>{account.followers_count.toLocaleString("en-GB")} followers · </>}
            {account.tracked_posts} posts tracked ·{" "}
            {account.last_synced_at
              ? `updated ${formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })}`
              : "first figures on their way"}
          </p>
          <WhatWeSee />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={disconnect} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
            <p className="text-xs text-gray-500">
              You can also remove access in Instagram: Settings → Website permissions → Apps and websites.
            </p>
          </div>
        </>
      ) : (
        <>
          {account?.status === "expired" && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Instagram ended our access to @{account.username} (it expires if not renewed, or was removed). Connect again to keep
              your figures up to date.
            </p>
          )}
          <p className="text-sm text-gray-600">
            Connect your Instagram professional (Creator or Business) account so the team can see which posts work best and plan
            with you.
          </p>
          <WhatWeSee />
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="bg-gold text-black hover:bg-gold/90">
              <a href="/api/instagram/connect">{account ? "Connect again" : "Connect Instagram"}</a>
            </Button>
            <p className="text-xs text-gray-500">You&apos;ll log in on Instagram and can see exactly what&apos;s shared before agreeing.</p>
          </div>
        </>
      )}
    </section>
  );
}
