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
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  User,
  Briefcase,
  MapPin,
  Star,
  Link as LinkIcon,
} from "lucide-react";
import type { Talent, Industry } from "@/lib/data/talents";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PortfolioManager } from "@/components/admin/PortfolioManager";

export default function AdminTalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState<Industry | "all">("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Talent>>({
    name: "",
    industry: "music",
    gender: "male",
    ageGroup: "adult",
    profession: "",
    location: "",
    bio: "",
    tagline: "",
    skills: [],
    imageSrc: "",
    featured: false,
    socialLinks: {},
    portfolio: [],
  });

  // Fetch talents
  useEffect(() => {
    fetchTalents();
  }, []);

  // Filter talents
  useEffect(() => {
    let filtered = talents;

    if (searchTerm) {
      filtered = filtered.filter(
        (talent) =>
          talent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          talent.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
          talent.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterIndustry !== "all") {
      filtered = filtered.filter((talent) => talent.industry === filterIndustry);
    }

    setFilteredTalents(filtered);
  }, [talents, searchTerm, filterIndustry]);

  const fetchTalents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/talents");
      const data = await response.json();
      setTalents(data);
      setFilteredTalents(data);
    } catch (error) {
      console.error("Error fetching talents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/talents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTalents();
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating talent:", error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTalent) return;

    try {
      const response = await fetch(`/api/talents/${selectedTalent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTalents();
        setIsEditDialogOpen(false);
        setSelectedTalent(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error updating talent:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTalent) return;

    try {
      const response = await fetch(`/api/talents/${selectedTalent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTalents();
        setIsDeleteDialogOpen(false);
        setSelectedTalent(null);
      }
    } catch (error) {
      console.error("Error deleting talent:", error);
    }
  };

  const openEditDialog = (talent: Talent) => {
    setSelectedTalent(talent);
    setFormData(talent);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (talent: Talent) => {
    setSelectedTalent(talent);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "music",
      gender: "male",
      ageGroup: "adult",
      profession: "",
      location: "",
      bio: "",
      tagline: "",
      skills: [],
      imageSrc: "",
      featured: false,
      socialLinks: {},
      portfolio: [],
    });
  };

  const handleFormChange = (field: string, value: any) => {
    if (field.startsWith("socialLinks.")) {
      const socialField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSkillsChange = (skillsString: string) => {
    const skills = skillsString.split(",").map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, skills }));
  };

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                Talent <span className="text-gold">Management</span>
              </h1>
              <p className="text-gray-300">
                Add and manage talents in your roster
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
              Add New Talent
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
                placeholder="Search talents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Industry Filter */}
            <Select value={filterIndustry} onValueChange={(value: Industry | 'all') => setFilterIndustry(value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="acting">Acting</SelectItem>
                <SelectItem value="modeling">Modeling</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="culinary">Culinary</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Talents List */}
      <section className="py-8">
        <div className="container px-4 mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading talents...</p>
            </div>
          ) : filteredTalents.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No talents found</p>
              <p className="text-sm text-gray-500">
                {searchTerm || filterIndustry !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first talent to get started"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTalents.map((talent) => (
                <div
                  key={talent.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Talent Image */}
                  {talent.imageSrc && (
                    <div className="relative h-64 bg-gray-100">
                      <img
                        src={talent.imageSrc}
                        alt={talent.name}
                        className="w-full h-full object-cover"
                      />
                      {talent.featured && (
                        <Badge className="absolute top-2 right-2 bg-gold">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Talent Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {talent.name}
                      </h3>
                      <Badge variant="outline" className="ml-2">
                        {talent.industry}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {talent.tagline}
                    </p>

                    {/* Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="h-4 w-4 mr-2 text-gold" />
                        {talent.profession}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gold" />
                        {talent.location}
                      </div>
                    </div>

                    {/* Skills */}
                    {talent.skills && talent.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {talent.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {talent.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{talent.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(talent)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(talent)}
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

      {/* Create/Edit Talent Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTalent(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? "Add New Talent" : "Edit Talent"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the talent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Profession *</label>
                <Input
                  value={formData.profession}
                  onChange={(e) => handleFormChange("profession", e.target.value)}
                  placeholder="DJ & Producer"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Industry *</label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleFormChange("industry", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acting">Acting</SelectItem>
                    <SelectItem value="modeling">Modeling</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="culinary">Culinary</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Gender *</label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleFormChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Age Group *</label>
                <Select
                  value={formData.ageGroup}
                  onValueChange={(value) => handleFormChange("ageGroup", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="teen">Teen</SelectItem>
                    <SelectItem value="young-adult">Young Adult</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location *</label>
              <Input
                value={formData.location}
                onChange={(e) => handleFormChange("location", e.target.value)}
                placeholder="Leeds, UK"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tagline *</label>
              <Input
                value={formData.tagline}
                onChange={(e) => handleFormChange("tagline", e.target.value)}
                placeholder="Rising DJ mixing Afrobeats and House"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Bio *</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleFormChange("bio", e.target.value)}
                placeholder="Tell us about this talent..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Skills (comma-separated)
              </label>
              <Input
                value={formData.skills?.join(", ") || ""}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="DJing, Music Production, Live Performance"
              />
            </div>

            {/* Image Upload */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Profile Image</h4>
              <ImageUpload
                value={formData.imageSrc}
                onChange={(url) => handleFormChange("imageSrc", url)}
              />
            </div>

            {/* Social Links */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Social Links</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Instagram URL"
                  value={formData.socialLinks?.instagram || ""}
                  onChange={(e) => handleFormChange("socialLinks.instagram", e.target.value)}
                />
                <Input
                  placeholder="Twitter URL"
                  value={formData.socialLinks?.twitter || ""}
                  onChange={(e) => handleFormChange("socialLinks.twitter", e.target.value)}
                />
                <Input
                  placeholder="YouTube URL"
                  value={formData.socialLinks?.youtube || ""}
                  onChange={(e) => handleFormChange("socialLinks.youtube", e.target.value)}
                />
                <Input
                  placeholder="Website URL"
                  value={formData.socialLinks?.website || ""}
                  onChange={(e) => handleFormChange("socialLinks.website", e.target.value)}
                />
              </div>
            </div>

            {/* Portfolio Management */}
            <div className="border-t pt-4">
              <PortfolioManager
                portfolio={Array.isArray(formData.portfolio) ? formData.portfolio : []}
                onChange={(portfolio) => handleFormChange("portfolio", portfolio)}
              />
            </div>

            {/* Featured */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured || false}
                onChange={(e) => handleFormChange("featured", e.target.checked)}
                className="rounded"
              />
              <label htmlFor="featured" className="text-sm">
                Featured Talent (displayed prominently on homepage)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTalent(null);
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
              {isCreateDialogOpen ? "Add Talent" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Talent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this talent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedTalent && (
            <div className="bg-gray-50 rounded-lg p-4 my-4">
              <p className="font-semibold text-gray-900">{selectedTalent.name}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedTalent.profession}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedTalent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Talent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
