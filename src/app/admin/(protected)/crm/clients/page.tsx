"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORG_TYPES, type Contact, type Organisation } from "@/lib/crm/types";
import { CrmShell, api, errorMessage, useCrmOptions } from "@/components/crm/shared";
import { ClientDialog, ContactDialog } from "@/components/crm/ClientDialogs";

type Tab = "clients" | "people";

export default function ClientsPage() {
  const options = useCrmOptions();
  const [tab, setTab] = useState<Tab>("clients");
  const [query, setQuery] = useState("");
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientDialog, setClientDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    try {
      const [orgs, people] = await Promise.all([
        api<Organisation[]>(`/api/crm/organisations${q}`),
        api<Contact[]>(`/api/crm/contacts${q}`),
      ]);
      setOrganisations(orgs);
      setContacts(people);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return (
    <CrmShell
      title={
        <>
          <span className="text-gold">Clients</span> &amp; contacts
        </>
      }
      subtitle="Brands, venues, promoters and the people you deal with."
      actions={
        <>
          <Button onClick={() => setContactDialog({ open: true, contact: null })} variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white hover:text-black">
            <Plus className="mr-2 h-4 w-4" />
            Contact
          </Button>
          <Button onClick={() => setClientDialog(true)} className="bg-gold text-black hover:bg-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Client
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex self-start rounded-md border bg-white p-0.5 text-sm">
          {(["clients", "people"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded px-3 py-1 ${tab === value ? "bg-black text-white" : "text-gray-600"}`}
            >
              {value === "clients" ? `Clients (${organisations.length})` : `People (${contacts.length})`}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, city or tag" className="bg-white pl-9" />
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {tab === "clients" ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          {organisations.length === 0 && !loading ? (
            <p className="p-8 text-center text-sm text-gray-500">No clients yet.</p>
          ) : (
            <ul className="divide-y">
              {organisations.map((org) => (
                <li key={org.id}>
                  <Link href={`/admin/crm/clients/${org.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{org.name}</p>
                      <p className="truncate text-sm text-gray-500">
                        {ORG_TYPES[org.type]}
                        {org.city ? ` · ${org.city}` : ""}
                        {org.tags.length ? ` · ${org.tags.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right text-sm text-gray-500">
                      <p>{org.open_deals} open deal{org.open_deals === 1 ? "" : "s"}</p>
                      <p className="text-xs">{org.contacts_count} contact{org.contacts_count === 1 ? "" : "s"}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          {contacts.length === 0 && !loading ? (
            <p className="p-8 text-center text-sm text-gray-500">No contacts yet.</p>
          ) : (
            <ul className="divide-y">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    onClick={() => setContactDialog({ open: true, contact })}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {contact.name}
                        {contact.do_not_contact && (
                          <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">
                            <Ban className="h-3 w-3" /> Do not contact
                          </span>
                        )}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {[contact.job_title, contact.organisation?.name].filter(Boolean).join(" · ") || "Private individual"}
                      </p>
                    </div>
                    <p className="hidden flex-shrink-0 text-sm text-gray-500 sm:block">{contact.email ?? contact.phone ?? ""}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ClientDialog open={clientDialog} onOpenChange={setClientDialog} organisation={null} options={options} onSaved={load} />
      <ContactDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((d) => ({ ...d, open }))}
        contact={contactDialog.contact}
        organisations={organisations}
        onSaved={load}
      />
    </CrmShell>
  );
}
