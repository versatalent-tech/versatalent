"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isBefore, parseISO } from "date-fns";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DocumentsPanel } from "@/components/documents/DocumentsPanel";
import { DOCUMENT_KINDS, type ExpiringDocument } from "@/lib/documents/types";
import type { BookingOptions } from "@/components/bookings/BookingDialog";
import { api, selectClass } from "@/components/crm/shared";

function dueText(doc: ExpiringDocument): string {
  const today = new Date();
  if (doc.delete_after && isBefore(parseISO(doc.delete_after), today)) return `Delete by ${format(parseISO(doc.delete_after), "d MMM yyyy")} (passed)`;
  if (doc.expires_on) {
    const expires = parseISO(doc.expires_on);
    return isBefore(expires, today) ? `Expired ${format(expires, "d MMM yyyy")}` : `Expires ${format(expires, "d MMM yyyy")}`;
  }
  return "";
}

function TalentDocuments() {
  const router = useRouter();
  const params = useSearchParams();
  const [talents, setTalents] = useState<BookingOptions["talents"]>([]);
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const talentId = params.get("talent") ?? "";

  useEffect(() => {
    api<BookingOptions>("/api/bookings/options").then((o) => setTalents(o.talents)).catch(() => undefined);
    api<ExpiringDocument[]>("/api/documents/expiring").then(setExpiring).catch(() => undefined);
  }, []);

  // Pick the first talent when none is chosen (or the chosen one isn't available)
  useEffect(() => {
    if (talents.length > 0 && !talents.some((t) => t.id === talentId)) {
      router.replace(`/admin/bookings/talent-documents?talent=${talents[0].id}`);
    }
  }, [talents, talentId, router]);

  const talent = talents.find((t) => t.id === talentId);

  return (
    <SimpleMainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-10 md:py-12">
        <div className="container mx-auto px-4">
          <AdminBackLink />
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold text-white md:text-4xl">
                Talent <span className="text-gold">Documents</span>
              </h1>
              <p className="text-gray-300">Agreements, standing riders, comp cards, insurance and ID kept on each talent&apos;s profile.</p>
            </div>
            <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
              <Link href="/admin/bookings">
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="min-h-[60vh] bg-gray-50 py-6">
        <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            {talents.length === 0 ? (
              <p className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">No talents assigned to you yet.</p>
            ) : (
              <>
                <select
                  id="talent-documents-talent"
                  className={`${selectClass} w-auto bg-white`}
                  value={talentId}
                  onChange={(e) => router.replace(`/admin/bookings/talent-documents?talent=${e.target.value}`)}
                  aria-label="Talent"
                >
                  {talents.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {talent && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{talent.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DocumentsPanel key={talent.id} owner={{ talentId: talent.id }} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Expiring or due for deletion
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiring.length === 0 ? (
                  <p className="text-sm text-gray-500">Nothing expires in the next 30 days.</p>
                ) : (
                  <ul className="space-y-3">
                    {expiring.map((doc) => (
                      <li key={doc.id}>
                        <Link href={`/admin/bookings/talent-documents?talent=${doc.talent.id}`} className="block hover:text-gold">
                          <p className="text-sm font-medium">
                            {doc.talent.name}: {DOCUMENT_KINDS[doc.kind]}
                          </p>
                          <p className="truncate text-xs text-gray-500">{doc.filename}</p>
                          <p className="text-xs font-medium text-red-700">{dueText(doc)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SimpleMainLayout>
  );
}

export default function TalentDocumentsPage() {
  return (
    <Suspense>
      <TalentDocuments />
    </Suspense>
  );
}
