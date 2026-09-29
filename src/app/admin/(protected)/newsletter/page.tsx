"use client";

import { useState, useEffect } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  Trash2,
  Download,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import type { NewsletterSubscriber } from "@/lib/db/types";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "unsubscribed">("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unsubscribed: 0,
  });

  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<NewsletterSubscriber | null>(null);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);

  // Fetch subscribers
  useEffect(() => {
    fetchSubscribers();
  }, []);

  // Filter subscribers
  useEffect(() => {
    let filtered = subscribers;

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter((sub) => sub.is_active);
      } else if (filterStatus === "unsubscribed") {
        filtered = filtered.filter((sub) => !sub.is_active);
      }
    }

    setFilteredSubscribers(filtered);
  }, [subscribers, searchTerm, filterStatus]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/newsletter?activeOnly=false");
      const data = await response.json();
      setSubscribers(data);
      setFilteredSubscribers(data);

      // Calculate stats
      const active = data.filter((s: NewsletterSubscriber) => s.is_active).length;
      setStats({
        total: data.length,
        active,
        unsubscribed: data.length - active,
      });
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      setError("Failed to fetch subscribers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubscriber) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/newsletter/${selectedSubscriber.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSubscribers();
        setIsDeleteDialogOpen(false);
        setSelectedSubscriber(null);
        setSuccess("Subscriber deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete subscriber");
      }
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      setError("Failed to delete subscriber. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (subscriber: NewsletterSubscriber) => {
    try {
      const response = await fetch(`/api/newsletter/${subscriber.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !subscriber.is_active }),
      });

      if (response.ok) {
        await fetchSubscribers();
        setSuccess(subscriber.is_active ? "Subscriber deactivated" : "Subscriber reactivated");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update subscriber status");
      }
    } catch (error) {
      console.error("Error toggling subscriber status:", error);
      setError("Failed to update subscriber status");
    }
  };

  const handleExportEmails = async () => {
    try {
      const response = await fetch("/api/newsletter?export=true");
      const data = await response.json();

      // Create CSV content
      const csvContent = "data:text/csv;charset=utf-8,"
        + "Email,Name\n"
        + data.map((s: { email: string; name?: string }) =>
            `${s.email},${s.name || ""}`
          ).join("\n");

      // Download the file
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess("Subscribers exported successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error exporting subscribers:", error);
      setError("Failed to export subscribers");
    }
  };

  const handleCopyEmails = async () => {
    try {
      const activeEmails = subscribers
        .filter((s) => s.is_active)
        .map((s) => s.email)
        .join(", ");

      await navigator.clipboard.writeText(activeEmails);
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 2000);
      setSuccess("Emails copied to clipboard!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error copying emails:", error);
      setError("Failed to copy emails");
    }
  };

  const openDeleteDialog = (subscriber: NewsletterSubscriber) => {
    setSelectedSubscriber(subscriber);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        {/* Header */}
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  Newsletter <span className="text-gold">Subscribers</span>
                </h1>
                <p className="text-gray-300">
                  Manage newsletter subscriptions and export email lists
                </p>
              </div>
              <div className="flex gap-2">
                <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
                <Button
                  onClick={handleExportEmails}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleCopyEmails}
                  className="bg-gold hover:bg-gold/90 text-white"
                >
                  {copiedEmails ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copiedEmails ? "Copied!" : "Copy Emails"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white py-6 border-b">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                </div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">{stats.active}</span>
                </div>
                <p className="text-sm text-green-600">Active</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserX className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-700">{stats.unsubscribed}</span>
                </div>
                <p className="text-sm text-red-600">Unsubscribed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Success/Error Messages */}
        {(success || error) && (
          <div className="container px-4 mx-auto mt-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <section className="bg-gray-50 py-6 border-b">
          <div className="container px-4 mx-auto">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                  className={filterStatus === "all" ? "bg-gold hover:bg-gold/90" : ""}
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("active")}
                  className={filterStatus === "active" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Active ({stats.active})
                </Button>
                <Button
                  variant={filterStatus === "unsubscribed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("unsubscribed")}
                  className={filterStatus === "unsubscribed" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Unsubscribed ({stats.unsubscribed})
                </Button>
              </div>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubscribers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {/* Subscribers List */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading subscribers...</p>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No subscribers found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Subscribers will appear here when people sign up for the newsletter"}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subscribed</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Source</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{subscriber.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{subscriber.name || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={subscriber.is_active ? "default" : "secondary"}
                            className={subscriber.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                          >
                            {subscriber.is_active ? "Active" : "Unsubscribed"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {new Date(subscriber.subscribed_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {subscriber.source || "website"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(subscriber)}
                              className={subscriber.is_active
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                              }
                            >
                              {subscriber.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Reactivate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(subscriber)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Subscriber</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this subscriber? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {selectedSubscriber && (
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <p className="font-semibold text-gray-900">{selectedSubscriber.email}</p>
                {selectedSubscriber.name && (
                  <p className="text-sm text-gray-600 mt-1">{selectedSubscriber.name}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedSubscriber(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
