"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { takeConnectResult } from "@/lib/instagram/messages";
import type { InstagramAccountSummary } from "@/lib/db/repositories/instagram-accounts";

interface AccountsResponse {
  configured: boolean;
  accounts: InstagramAccountSummary[];
}

const STATUS: Record<InstagramAccountSummary["status"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-green-100 text-green-800" },
  expired: { label: "Needs reconnecting", className: "bg-amber-100 text-amber-800" },
  disconnected: { label: "Disconnected", className: "bg-gray-100 text-gray-600" },
};

/** Admin: Instagram accounts connected for figures (talents connect from their portal) */
export function InstagramAccounts() {
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (url: string, init: RequestInit, key: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch(url, { cache: "no-store", ...init });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setData(body.data);
      if (body.message) setMessage({ ok: true, text: body.message });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    setMessage(takeConnectResult());
    fetch("/api/admin/instagram/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => (body.success ? setData(body.data) : setMessage({ ok: false, text: body.error })))
      .catch(() => setMessage({ ok: false, text: "Failed to load Instagram accounts" }));
  }, []);

  const sync = (accountId: string | null) =>
    call(
      "/api/admin/instagram/accounts",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account_id: accountId }) },
      accountId ?? "all"
    );

  const disconnect = (account: InstagramAccountSummary) => {
    if (!window.confirm(`Disconnect @${account.username}? Its access is deleted and no new figures are collected.`)) return;
    call(`/api/admin/instagram/accounts/${account.id}`, { method: "DELETE" }, account.id);
  };

  const agencyConnected = data?.accounts.some((a) => !a.talent && a.status === "connected");

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">Connected accounts</CardTitle>
        {data?.configured && (
          <div className="flex flex-wrap gap-2">
            {!agencyConnected && (
              <Button asChild size="sm" variant="outline">
                <a href="/api/instagram/connect?for=agency">
                  <Link2 className="h-4 w-4 mr-2" /> Connect VersaTalent&apos;s account
                </a>
              </Button>
            )}
            {data.accounts.some((a) => a.status === "connected") && (
              <Button size="sm" variant="outline" onClick={() => sync(null)} disabled={busy !== null}>
                {busy === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync all now
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          Talents connect their own account from their portal (Profile → Instagram). Figures are collected every night: followers,
          and each post and reel from the last 90 days. Only profile and insights access is ever asked for, never messages or
          comments.
        </p>
        {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}

        {!data ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : !data.configured ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Not switched on yet: the Meta app&apos;s details need adding in Netlify (see docs/INSTAGRAM_SETUP.md).
          </p>
        ) : data.accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No accounts connected yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {data.accounts.map((account) => {
              const status = STATUS[account.status];
              return (
                <li key={account.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                  <div className="min-w-[12rem]">
                    <p className="font-medium text-gray-900">{account.talent?.name ?? "VersaTalent"}</p>
                    <p className="text-sm text-gray-500">@{account.username}</p>
                  </div>
                  <Badge variant="outline" className={`border-0 ${status.className}`}>{status.label}</Badge>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>
                      {account.followers_count !== null && <>{account.followers_count.toLocaleString("en-GB")} followers · </>}
                      {account.tracked_posts} posts tracked
                    </p>
                    <p>
                      {account.last_synced_at
                        ? `Synced ${formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })}`
                        : "Not synced yet"}
                      {account.status === "connected" && account.token_expires_at && (
                        <> · access renews automatically (until {format(new Date(account.token_expires_at), "d MMM")})</>
                      )}
                    </p>
                    {account.last_sync_error && <p className="text-red-600">{account.last_sync_error}</p>}
                  </div>
                  {account.status === "connected" && (
                    <div className="flex gap-1 ml-auto">
                      <Button size="sm" variant="ghost" onClick={() => sync(account.id)} disabled={busy !== null}>
                        {busy === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-1">Sync</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => disconnect(account)}
                        disabled={busy !== null}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Unlink className="h-4 w-4" />
                        <span className="ml-1">Disconnect</span>
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
