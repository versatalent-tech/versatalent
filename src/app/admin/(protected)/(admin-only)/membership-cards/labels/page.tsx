"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CardRequest } from "@/lib/membership/types";
import { api } from "@/components/crm/shared";

/** Printable address labels for the selected card requests */
function Labels() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const [requests, setRequests] = useState<CardRequest[] | null>(null);

  useEffect(() => {
    api<{ requests: CardRequest[] }>("/api/admin/card-requests?status=open")
      .then((data) => setRequests(data.requests.filter((r) => ids.includes(r.id))))
      .catch(() => setRequests([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!requests) return <p className="p-8">Loading…</p>;

  return (
    <div className="bg-white p-6 text-black">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 10mm; } }`}</style>
      <div className="no-print mb-6 flex items-center justify-between">
        <p>{requests.length} label{requests.length === 1 ? "" : "s"}</p>
        <button onClick={() => window.print()} className="rounded bg-black px-4 py-2 text-white">
          Print
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {requests.map((r) => (
          <div key={r.id} className="break-inside-avoid rounded border border-gray-300 p-4 text-base leading-snug">
            <p className="font-semibold">{r.recipient_name}</p>
            <p>{r.address_line1}</p>
            {r.address_line2 && <p>{r.address_line2}</p>}
            <p>{r.city}</p>
            <p className="font-semibold">{r.postcode}</p>
            {r.country !== "United Kingdom" && <p>{r.country}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LabelsPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <Labels />
    </Suspense>
  );
}
