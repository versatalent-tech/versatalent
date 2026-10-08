"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, Globe, Loader2, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORG_TYPES, type Activity, type Contact, type Deal, type Organisation } from "@/lib/crm/types";
import { CrmShell, StageBadge, api, errorMessage, formatMoney, useCrmOptions } from "@/components/crm/shared";
import { ClientDialog, ContactDialog } from "@/components/crm/ClientDialogs";
import { DealDialog } from "@/components/crm/DealDialog";
import { ActivityComposer, Timeline } from "@/components/crm/Timeline";

interface ClientData {
  organisation: Organisation;
  contacts: Contact[];
  deals: Deal[];
  timeline: Activity[];
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const options = useCrmOptions();
  const [data, setData] = useState<ClientData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newDeal, setNewDeal] = useState(false);
  const [contactDialog, setContactDialog] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });

  const load = useCallback(async () => {
    try {
      setData(await api<ClientData>(`/api/crm/organisations/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!data || !window.confirm(`Delete ${data.organisation.name}? Its deals and contacts are kept but unlinked.`)) return;
    try {
      await api(`/api/crm/organisations/${id}`, { method: "DELETE" });
      router.push("/admin/crm/clients");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!data) {
    return (
      <CrmShell title="Client">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        )}
      </CrmShell>
    );
  }

  const { organisation: org, contacts, deals, timeline } = data;

  return (
    <CrmShell
      title={org.name}
      subtitle={
        <span className="text-sm">
          {ORG_TYPES[org.type]}
          {org.owner ? ` · Owner: ${org.owner.name}` : ""}
        </span>
      }
      actions={
        <>
          <Button onClick={() => setNewDeal(true)} className="bg-gold text-black hover:bg-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Deal
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)} className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {options.canDelete && (
            <Button variant="outline" onClick={remove} aria-label="Delete client" className="border-white/40 bg-transparent text-white hover:bg-red-600 hover:text-white">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      }
    >
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-sm text-gray-500">No deals with this client yet.</p>
              ) : (
                <ul className="divide-y">
                  {deals.map((deal) => (
                    <li key={deal.id}>
                      <Link href={`/admin/crm/deals/${deal.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-gold">
                        <span className="min-w-0 truncate font-medium">{deal.title}</span>
                        <span className="flex flex-shrink-0 items-center gap-3 text-sm">
                          {formatMoney(deal.value_cents, deal.currency)}
                          <StageBadge stage={deal.stage} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Activity</h2>
            <ActivityComposer links={{ organisation_id: org.id }} options={options} onSaved={load} />
            <Timeline activities={timeline} options={options} onChanged={load} showContext />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {org.email && (
                <a href={`mailto:${org.email}`} className="flex items-center gap-2 text-gray-600 hover:text-gold">
                  <Mail className="h-4 w-4" /> {org.email}
                </a>
              )}
              {org.phone && (
                <a href={`tel:${org.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-gold">
                  <Phone className="h-4 w-4" /> {org.phone}
                </a>
              )}
              {org.website && (
                <a
                  href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold"
                >
                  <Globe className="h-4 w-4" /> {org.website}
                </a>
              )}
              {(org.city || org.country) && (
                <p className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" /> {[org.city, org.country].filter(Boolean).join(", ")}
                </p>
              )}
              {org.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {org.tags.map((tag) => (
                    <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {org.notes && <p className="whitespace-pre-wrap pt-2 text-gray-700">{org.notes}</p>}
              {!org.email && !org.phone && !org.website && !org.city && !org.notes && (
                <p className="text-gray-500">No details yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">People</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setContactDialog({ open: true, contact: null })}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {contacts.map((contact) => (
                    <li key={contact.id}>
                      <button onClick={() => setContactDialog({ open: true, contact })} className="w-full text-left hover:text-gold">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {contact.name}
                          {contact.do_not_contact && <Ban className="h-3.5 w-3.5 text-red-600" aria-label="Do not contact" />}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {[contact.job_title, contact.email, contact.phone].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ClientDialog open={editing} onOpenChange={setEditing} organisation={org} options={options} onSaved={load} />
      <ContactDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((d) => ({ ...d, open }))}
        contact={contactDialog.contact}
        organisations={[{ id: org.id, name: org.name }]}
        defaultOrganisationId={org.id}
        onSaved={load}
      />
      <DealDialog
        open={newDeal}
        onOpenChange={setNewDeal}
        deal={null}
        options={options}
        defaultOrganisationId={org.id}
        onSaved={(deal) => router.push(`/admin/crm/deals/${deal.id}`)}
      />
    </CrmShell>
  );
}
