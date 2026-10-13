"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import { DOCUMENT_KINDS, type SharedDocument } from "@/lib/documents/types";
import { api } from "@/components/crm/shared";

/** Documents on the talent's profile that the team shared with them (hidden when there are none) */
export function MyDocuments() {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);

  useEffect(() => {
    api<SharedDocument[]>("/api/portal/documents").then(setDocuments).catch(() => undefined);
  }, []);

  if (documents.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <h2 className="font-semibold">My documents</h2>
        <p className="text-sm text-gray-500">Shared with you by the VersaTalent team.</p>
      </div>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <a href={`/api/documents/${doc.id}`} className="inline-flex items-start gap-2 text-sm text-gold underline">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                {DOCUMENT_KINDS[doc.kind]}: {doc.filename}
                {doc.expires_on && <span className="text-gray-500 no-underline"> (expires {format(parseISO(doc.expires_on), "d MMM yyyy")})</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
