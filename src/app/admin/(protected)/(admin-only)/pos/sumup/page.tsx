"use client";

import { useCallback, useEffect, useState } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CheckCircle2, CircleAlert, Loader2, Trash2 } from "lucide-react";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

interface Reader {
  id: string;
  name: string;
  status: string;
  device?: { model?: string; identifier?: string };
}

type Config = Record<"apiKey" | "merchantCode" | "affiliateKey" | "affiliateAppId", boolean>;

const SETTINGS: { key: keyof Config; env: string; label: string }[] = [
  { key: "apiKey", env: "SUMUP_API_KEY", label: "Secret API key" },
  { key: "merchantCode", env: "SUMUP_MERCHANT_CODE", label: "Merchant code" },
  { key: "affiliateKey", env: "SUMUP_AFFILIATE_KEY", label: "Affiliate key" },
  { key: "affiliateAppId", env: "SUMUP_AFFILIATE_APP_ID", label: "Affiliate app ID" },
];

export default function AdminSumUpPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<{ error: string; help?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [readerName, setReaderName] = useState("Bar Solo");
  const [pairing, setPairing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/sumup/readers", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to load SumUp settings");
        return;
      }
      setConfig(data.config);
      setHints(data.hints || []);
      setReaders(data.readers || []);
      setConnectionError(data.error ? { error: data.error, help: data.help } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const configured = config ? Object.values(config).every(Boolean) : false;

  async function pair() {
    setPairing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/sumup/readers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pairing_code: pairingCode, name: readerName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Pairing failed");
        return;
      }
      setSuccess(`Paired "${data.reader?.name}". It may show as processing for a moment.`);
      setPairingCode("");
      await load();
    } finally {
      setPairing(false);
    }
  }

  async function unpair(reader: Reader) {
    if (!confirm(`Unpair "${reader.name}"? The tills won't be able to charge on it until it's paired again.`)) return;
    setError(null);
    const response = await fetch(`/api/admin/sumup/readers/${reader.id}`, { method: "DELETE", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Failed to unpair the reader");
      return;
    }
    setSuccess(`Unpaired "${reader.name}". Also disconnect it on the reader: Connections → API → Disconnect.`);
    await load();
  }

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <AdminBackLink />
                <h1 className="text-3xl font-bold text-white mb-2">
                  SumUp <span className="text-gold">Card Payments</span>
                </h1>
                <p className="text-gray-300">Connect SumUp and pair card readers for the tills</p>
              </div>
              <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black w-fit" />
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="container px-4 mx-auto max-w-3xl space-y-8">
            {error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
            )}

            {/* Settings */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-1">1. SumUp settings</h2>
              <p className="text-sm text-gray-600 mb-4">
                Create these at me.sumup.com → Developers, then add them in Netlify → Site configuration →
                Environment variables and redeploy. They are never shown here.
              </p>
              {loading && !config ? (
                <p className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
              ) : (
                <ul className="space-y-2">
                  {SETTINGS.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-sm">
                      {config?.[s.key] ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="font-medium">{s.label}</span>
                      <code className="text-xs text-gray-500">{s.env}</code>
                      {!config?.[s.key] && <span className="text-amber-600 text-xs">missing</span>}
                    </li>
                  ))}
                </ul>
              )}
              {hints.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              )}
              {connectionError && (
                <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-medium">{connectionError.error}</p>
                  {connectionError.help && <p className="mt-1">{connectionError.help}</p>}
                </div>
              )}
              {configured && !connectionError && (
                <p className="mt-4 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> Connected to SumUp
                </p>
              )}
            </div>

            {/* Readers */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">2. Card readers</h2>
              {!configured ? (
                <p className="text-sm text-gray-600">Add the SumUp settings first.</p>
              ) : connectionError ? (
                <p className="text-sm text-gray-600">Fix the SumUp connection above first.</p>
              ) : readers.length === 0 ? (
                <p className="text-sm text-gray-600">No readers paired yet.</p>
              ) : (
                <ul className="divide-y border rounded-md">
                  {readers.map((reader) => (
                    <li key={reader.id} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="font-medium">{reader.name}</p>
                        <p className="text-xs text-gray-500">
                          {reader.device?.model === "virtual-solo" ? "Virtual Solo (testing)" : "SumUp Solo"}
                          {reader.device?.identifier ? ` · ${reader.device.identifier}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={reader.status === "paired" ? "default" : "secondary"}>{reader.status}</Badge>
                        <Button variant="outline" size="sm" onClick={() => unpair(reader)} title="Unpair reader">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pair */}
            {configured && !connectionError && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-1">3. Pair a Solo reader</h2>
                <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1 mb-4">
                  <li>On the Solo, log out of SumUp and connect it to Wi-Fi.</li>
                  <li>Open the top menu → <strong>Connections</strong> → <strong>API</strong> → <strong>Connect</strong>.</li>
                  <li>Enter the pairing code it shows (valid for 5 minutes).</li>
                </ol>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="Pairing code"
                    autoCapitalize="characters"
                  />
                  <Input
                    value={readerName}
                    onChange={(e) => setReaderName(e.target.value)}
                    placeholder="Reader name, e.g. Bar Solo"
                  />
                  <Button
                    onClick={pair}
                    disabled={pairing || !pairingCode || !readerName.trim()}
                    className="bg-gold hover:bg-gold/90 text-white"
                  >
                    {pairing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Pairing…</> : "Pair reader"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
