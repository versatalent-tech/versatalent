"use client";

import { useState, useEffect } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Save,
  X,
  Users,
  Tag,
  DollarSign,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import type { Event, EventType, EventStatus, CreateEventRequest, EventVenue, EventPrice, Talent } from "@/lib/db/types";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { TalentMultiSelect } from "@/components/admin/TalentMultiSelect";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

// Helper function to check if an event should be auto-completed
function shouldAutoComplete(event: Partial<Event>): boolean {
  if (!event.start_time) return false;
  if (event.status === 'completed' || event.status === 'cancelled') return false;

  const eventDate = new Date(event.start_time);
  const now = new Date();
  return eventDate < now;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");

  // Check-in state
  const [checkinStats, setCheckinStats] = useState<Record<string, { enabled: boolean; totalCheckins: number; uniqueAttendees: number }>>({});

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoCompleteNotice, setAutoCompleteNotice] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Event>>({
    title: "",
    description: "",
    type: "performance",
    status: "upcoming",
    start_time: new Date(),
    display_time: "",
    venue: {
      name: "",
      address: "",
      city: "",
      country: "UK",
    },
    talent_ids: [],
    image_url: "",
    featured: false,
    tags: [],
    price: {
      min: 0,
      currency: "GBP",
      isFree: true,
    },
    is_published: true,
  });

  const [talents, setTalents] = useState<Talent[]>([]);
  const [talentsLoading, setTalentsLoading] = useState(true);

  // Fetch talents from API
  useEffect(() => {
    const fetchTalents = async () => {
      try {
        setTalentsLoading(true);
        const response = await fetch("/api/talents?activeOnly=true");
        const data = await response.json();
        setTalents(data);
      } catch (error) {
        console.error("Error fetching talents:", error);
      } finally {
        setTalentsLoading(false);
      }
    };
    fetchTalents();
  }, []);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events
  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.venue.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((event) => event.type === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((event) => event.status === filterStatus);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, filterType, filterStatus]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?includeAll=true");
      const data = await response.json();

      // Auto-complete past events that aren't already completed/cancelled
      const updatedEvents = data.map((event: Event) => {
        if (shouldAutoComplete(event)) {
          return { ...event, status: 'completed' as EventStatus };
        }
        return event;
      });

      setEvents(updatedEvents);
      setFilteredEvents(updatedEvents);

      // Update past events in the database (fire and forget)
      updatedEvents.forEach(async (event: Event) => {
        const original = data.find((e: Event) => e.id === event.id);
        if (original && original.status !== event.status && event.status === 'completed') {
          try {
            await fetch(`/api/events/${event.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: 'completed' }),
            });
          } catch (err) {
            console.error('Failed to auto-complete event:', event.id, err);
          }
        }
      });

      // Fetch check-in stats for each event
      const stats: Record<string, { enabled: boolean; totalCheckins: number; uniqueAttendees: number }> = {};
      for (const event of data) {
        try {
          const statsResponse = await fetch(`/api/events/${event.id}/checkins`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            stats[event.id] = {
              enabled: statsData.checkins_enabled || false,
              totalCheckins: statsData.total_checkins || 0,
              uniqueAttendees: statsData.unique_attendees || 0
            };
          }
        } catch (err) {
          console.error(`Error fetching check-in stats for event ${event.id}:`, err);
        }
      }
      setCheckinStats(stats);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const enableCheckins = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/checkins`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchEvents();
        setSuccess('Check-ins enabled!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to enable check-ins');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error enabling check-ins:', error);
      setError('Failed to enable check-ins. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const disableCheckins = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/checkins`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchEvents();
        setSuccess('Check-ins disabled!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disable check-ins');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error disabling check-ins:', error);
      setError('Failed to disable check-ins. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);

      // Check if event should be auto-completed
      let eventData = { ...formData };
      if (shouldAutoComplete(eventData)) {
        eventData.status = 'completed';
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        await fetchEvents();
        setIsCreateDialogOpen(false);
        resetForm();

        if (eventData.status === 'completed' && formData.status !== 'completed') {
          setSuccess("Event created and automatically marked as completed (past date)");
        } else {
          setSuccess("Event created successfully!");
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create event. Please check all required fields.");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setError("Failed to create event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;

    try {
      setSaving(true);
      setError(null);

      // Check if event should be auto-completed
      let eventData = { ...formData };
      if (shouldAutoComplete(eventData)) {
        eventData.status = 'completed';
      }

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        await fetchEvents();
        setIsEditDialogOpen(false);
        setSelectedEvent(null);
        resetForm();

        if (eventData.status === 'completed' && formData.status !== 'completed') {
          setSuccess("Event updated and automatically marked as completed (past date)");
        } else {
          setSuccess("Event updated successfully!");
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update event. Please check all required fields.");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      setError("Failed to update event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchEvents();
        setIsDeleteDialogOpen(false);
        setSelectedEvent(null);
        setSuccess("Event deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete event.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Failed to delete event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setFormData(event);
    setError(null);

    // Check if event should be auto-completed
    if (shouldAutoComplete(event)) {
      setAutoCompleteNotice("This event's date has passed. It will be automatically marked as completed when saved.");
    } else {
      setAutoCompleteNotice(null);
    }

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (event: Event) => {
    setSelectedEvent(event);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "performance",
      status: "upcoming",
      start_time: new Date(),
      display_time: "",
      venue: {
        name: "",
        address: "",
        city: "",
        country: "UK",
      },
      talent_ids: [],
      image_url: "",
      featured: false,
      tags: [],
      price: {
        min: 0,
        currency: "GBP",
        isFree: true,
      },
      is_published: true,
    });
    setAutoCompleteNotice(null);
  };

  const handleFormChange = (field: string, value: string | number | boolean | string[] | undefined) => {
    if (field.startsWith("venue.")) {
      const venueField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        venue: {
          ...prev.venue!,
          [venueField]: value,
        },
      }));
    } else if (field.startsWith("price.")) {
      const priceField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        price: {
          ...prev.price!,
          [priceField]: value,
        },
      }));
    } else {
      setFormData((prev) => {
        const newData = {
          ...prev,
          [field]: value,
        };

        // Check for auto-complete when date changes
        if (field === 'start_time') {
          if (shouldAutoComplete(newData)) {
            setAutoCompleteNotice("This event's date is in the past. It will be automatically marked as completed when saved.");
          } else {
            setAutoCompleteNotice(null);
          }
        }

        return newData;
      });
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleTalentIdsChange = (talentIds: string[]) => {
    setFormData((prev) => ({ ...prev, talent_ids: talentIds }));
  };

  // Get talent names for display
  const getTalentNames = (talentIds: string[]) => {
    return talentIds
      .map((id) => talents.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ");
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
                  Event <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">
                  Create and manage events for your talent roster
                </p>
              </div>
              <div className="flex gap-2">
                <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
                <Button
                  onClick={() => {
                    resetForm();
                    setError(null);
                    setIsCreateDialogOpen(true);
                  }}
                  className="bg-gold hover:bg-gold/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
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
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: EventType | 'all') => setFilterType(value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="photoshoot">Photoshoot</SelectItem>
                <SelectItem value="match">Match</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="appearance">Appearance</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(value: EventStatus | 'all') => setFilterStatus(value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="py-8">
        <div className="container px-4 mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No events found</p>
              <p className="text-sm text-gray-500">
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first event to get started"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Event Image */}
                  {event.image_url && (
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      {event.featured && (
                        <Badge className="absolute top-2 right-2 bg-gold">
                          Featured
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Event Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 flex-1">
                        {event.title}
                      </h3>
                      <Badge
                        variant={
                          event.status === "upcoming"
                            ? "default"
                            : event.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                        className="ml-2"
                      >
                        {event.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    {/* Event Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gold" />
                        {new Date(event.start_time).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gold" />
                        {event.display_time || new Date(event.start_time).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gold" />
                        {event.venue.city}, {event.venue.country}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Tag className="h-4 w-4 mr-2 text-gold" />
                        {event.type}
                      </div>
                      {event.talent_ids && event.talent_ids.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-gold" />
                          <span className="truncate">
                            {getTalentNames(event.talent_ids) || `${event.talent_ids.length} talent(s)`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {event.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {event.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* NFC Check-in Stats */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gold" />
                          <span className="text-sm font-medium text-gray-900">NFC Check-ins</span>
                        </div>
                        <Badge
                          variant={checkinStats[event.id]?.enabled ? "default" : "secondary"}
                          className={checkinStats[event.id]?.enabled ? "bg-green-600" : ""}
                        >
                          {checkinStats[event.id]?.enabled ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Enabled</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Disabled</>
                          )}
                        </Badge>
                      </div>

                      {checkinStats[event.id]?.enabled && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="text-xs">
                            <span className="text-gray-500">Total Check-ins:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {checkinStats[event.id]?.totalCheckins || 0}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Unique Attendees:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {checkinStats[event.id]?.uniqueAttendees || 0}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          checkinStats[event.id]?.enabled
                            ? disableCheckins(event.id)
                            : enableCheckins(event.id)
                        }
                        className="w-full text-xs"
                      >
                        {checkinStats[event.id]?.enabled ? (
                          <><XCircle className="h-3 w-3 mr-1" /> Disable Check-ins</>
                        ) : (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Enable Check-ins</>
                        )}
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(event)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(event)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Create/Edit Event Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedEvent(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? "Create New Event" : "Edit Event"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the event
            </DialogDescription>
          </DialogHeader>

          {/* Auto-complete notice */}
          {autoCompleteNotice && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-2">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{autoCompleteNotice}</span>
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div>
              <label className="text-sm font-medium mb-2 block">Event Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Summer Beats Festival 2025"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Event Type *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleFormChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="photoshoot">Photoshoot</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="appearance">Appearance</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status *</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleFormChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ""}
                  onChange={(e) => handleFormChange("start_time", new Date(e.target.value).toISOString())}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Display Time *</label>
                <Input
                  value={formData.display_time || ""}
                  onChange={(e) => handleFormChange("display_time", e.target.value)}
                  placeholder="8:00 PM"
                />
              </div>
            </div>

            {/* Venue */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Venue Details</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Venue Name *"
                  value={formData.venue?.name}
                  onChange={(e) => handleFormChange("venue.name", e.target.value)}
                />
                <Input
                  placeholder="Address"
                  value={formData.venue?.address}
                  onChange={(e) => handleFormChange("venue.address", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City *"
                    value={formData.venue?.city}
                    onChange={(e) => handleFormChange("venue.city", e.target.value)}
                  />
                  <Input
                    placeholder="Country"
                    value={formData.venue?.country}
                    onChange={(e) => handleFormChange("venue.country", e.target.value)}
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Capacity (optional)"
                  value={formData.venue?.capacity || ""}
                  onChange={(e) => handleFormChange("venue.capacity", parseInt(e.target.value) || undefined)}
                />
                <Input
                  placeholder="Venue Website (optional)"
                  value={formData.venue?.website || ""}
                  onChange={(e) => handleFormChange("venue.website", e.target.value)}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Event Image</h4>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => handleFormChange("image_url", url)}
                type="event"
              />
            </div>

            {/* Featured Talents - Multi-Select */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gold" />
                Featured Talents
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Select the talents that will be featured in this event
              </p>
              <TalentMultiSelect
                talents={talents}
                selectedIds={formData.talent_ids || []}
                onChange={handleTalentIdsChange}
                loading={talentsLoading}
                placeholder="Search and select talents..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags?.join(", ") || ""}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="Festival, Music, Outdoor"
              />
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Pricing</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.price?.isFree || false}
                    onChange={(e) => handleFormChange("price.isFree", e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isFree" className="text-sm">
                    Free Event
                  </label>
                </div>

                {!formData.price?.isFree && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Min Price"
                      value={formData.price?.min || 0}
                      onChange={(e) => handleFormChange("price.min", parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      placeholder="Max Price (optional)"
                      value={formData.price?.max || ""}
                      onChange={(e) => handleFormChange("price.max", parseFloat(e.target.value) || undefined)}
                    />
                  </div>
                )}

                <Input
                  placeholder="Currency"
                  value={formData.price?.currency || "GBP"}
                  onChange={(e) => handleFormChange("price.currency", e.target.value)}
                />
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <Input
                placeholder="Tickets URL (optional)"
                value={formData.tickets_url || ""}
                onChange={(e) => handleFormChange("tickets_url", e.target.value)}
              />
              <Input
                placeholder="Organizer (optional)"
                value={formData.organizer || ""}
                onChange={(e) => handleFormChange("organizer", e.target.value)}
              />
              <Input
                type="number"
                placeholder="Expected Attendance (optional)"
                value={formData.expected_attendance || ""}
                onChange={(e) => handleFormChange("expected_attendance", parseInt(e.target.value) || undefined)}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e) => handleFormChange("featured", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="featured" className="text-sm">
                  Featured Event (displayed prominently on homepage)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published !== false}
                  onChange={(e) => handleFormChange("is_published", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="is_published" className="text-sm">
                  Published (visible on site)
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedEvent(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={isCreateDialogOpen ? handleCreate : handleUpdate}
              className="bg-gold hover:bg-gold/90 text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isCreateDialogOpen ? "Create Event" : "Save Changes"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="bg-gray-50 rounded-lg p-4 my-4">
              <p className="font-semibold text-gray-900">{selectedEvent.title}</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(selectedEvent.start_time).toLocaleDateString("en-GB")} at {selectedEvent.display_time || new Date(selectedEvent.start_time).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedEvent(null);
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
                  Delete Event
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
