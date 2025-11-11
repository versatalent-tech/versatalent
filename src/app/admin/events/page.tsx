"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
} from "lucide-react";
import type { EventItem, EventType, EventStatus } from "@/lib/data/events";
import { getTalents } from "@/lib/data/talents";
import { ImageUpload } from "@/components/admin/ImageUpload";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<EventItem>>({
    title: "",
    description: "",
    type: "performance",
    status: "upcoming",
    date: "",
    time: "",
    venue: {
      name: "",
      address: "",
      city: "",
      country: "UK",
    },
    talentIds: [],
    imageSrc: "",
    featured: false,
    tags: [],
    price: {
      min: 0,
      currency: "GBP",
      isFree: true,
    },
  });

  const talents = getTalents();

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
      const response = await fetch("/api/events");
      const data = await response.json();
      setEvents(data);
      setFilteredEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchEvents();
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchEvents();
        setIsEditDialogOpen(false);
        setSelectedEvent(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchEvents();
        setIsDeleteDialogOpen(false);
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const openEditDialog = (event: EventItem) => {
    setSelectedEvent(event);
    setFormData(event);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (event: EventItem) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "performance",
      status: "upcoming",
      date: "",
      time: "",
      venue: {
        name: "",
        address: "",
        city: "",
        country: "UK",
      },
      talentIds: [],
      imageSrc: "",
      featured: false,
      tags: [],
      price: {
        min: 0,
        currency: "GBP",
        isFree: true,
      },
    });
  };

  const handleFormChange = (field: string, value: string | number | boolean | undefined) => {
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
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleTalentIdsChange = (talentIdsString: string) => {
    const talentIds = talentIdsString.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, talentIds }));
  };

  return (
    <MainLayout>
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
            <Button
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </section>

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
                  {event.imageSrc && (
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={event.imageSrc}
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
                        {new Date(event.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gold" />
                        {event.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gold" />
                        {event.venue.city}, {event.venue.country}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Tag className="h-4 w-4 mr-2 text-gold" />
                        {event.type}
                      </div>
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
                <label className="text-sm font-medium mb-2 block">Date *</label>
                <Input
                  type="datetime-local"
                  value={formData.date ? new Date(formData.date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => handleFormChange("date", new Date(e.target.value).toISOString())}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Time *</label>
                <Input
                  value={formData.time}
                  onChange={(e) => handleFormChange("time", e.target.value)}
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
                value={formData.imageSrc}
                onChange={(url) => handleFormChange("imageSrc", url)}
              />
            </div>

            {/* Talent IDs */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Talent IDs (comma-separated)
              </label>
              <Input
                value={formData.talentIds?.join(", ") || ""}
                onChange={(e) => handleTalentIdsChange(e.target.value)}
                placeholder="1, 2, 3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available talents: {talents.map((t) => `${t.id} (${t.name})`).join(", ")}
              </p>
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
                value={formData.ticketsUrl || ""}
                onChange={(e) => handleFormChange("ticketsUrl", e.target.value)}
              />
              <Input
                placeholder="Organizer (optional)"
                value={formData.organizer || ""}
                onChange={(e) => handleFormChange("organizer", e.target.value)}
              />
              <Input
                type="number"
                placeholder="Expected Attendance (optional)"
                value={formData.expectedAttendance || ""}
                onChange={(e) => handleFormChange("expectedAttendance", parseInt(e.target.value) || undefined)}
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
            >
              <Save className="h-4 w-4 mr-2" />
              {isCreateDialogOpen ? "Create Event" : "Save Changes"}
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
                {new Date(selectedEvent.date).toLocaleDateString("en-GB")} at {selectedEvent.time}
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
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
