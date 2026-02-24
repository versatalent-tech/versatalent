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
  StarOff,
  Eye,
  EyeOff,
  Link as LinkIcon,
  KeyRound,
  Ruler,
  Palette,
  Trophy,
  Music,
} from "lucide-react";
import type {
  Talent,
  Industry,
  PortfolioItem,
  ModelingDetails,
  SportsDetails,
  MusicDetails,
  ActingDetails,
  CulinaryDetails,
  IndustryDetails,
} from "@/lib/db/types";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PortfolioManager } from "@/components/admin/PortfolioManager";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CredentialsDialog } from "@/components/admin/CredentialsDialog";
import { PasswordResetDialog } from "@/components/admin/PasswordResetDialog";
import { validateIndustryDetails } from "@/lib/utils/validation";
import { AlertTriangle, CheckCircle } from "lucide-react";

// Validation warnings display component
function IndustryValidationWarnings({ industry, details }: { industry: string; details: IndustryDetails | undefined }) {
  const validation = validateIndustryDetails(industry, details as Record<string, unknown>);

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded">
        <CheckCircle className="h-4 w-4" />
        <span>Industry details complete</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            Required Fields Missing
          </div>
          <ul className="text-sm text-red-600 list-disc list-inside">
            {validation.errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            Recommendations
          </div>
          <ul className="text-sm text-amber-600 list-disc list-inside">
            {validation.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper component for industry-specific forms
function ModelingFields({
  details,
  onChange,
}: {
  details: ModelingDetails;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 bg-pink-50 p-4 rounded-lg border border-pink-200">
      <h5 className="font-semibold text-pink-900 flex items-center gap-2">
        <Ruler className="h-4 w-4" />
        Model Measurements
      </h5>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Height</label>
          <Input
            value={details.height || ""}
            onChange={(e) => onChange("height", e.target.value)}
            placeholder="e.g., 5'10 or 178cm"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Chest</label>
          <Input
            value={details.chest || ""}
            onChange={(e) => onChange("chest", e.target.value)}
            placeholder="e.g., 34"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Waist</label>
          <Input
            value={details.waist || ""}
            onChange={(e) => onChange("waist", e.target.value)}
            placeholder="e.g., 26"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Hips</label>
          <Input
            value={details.hips || ""}
            onChange={(e) => onChange("hips", e.target.value)}
            placeholder="e.g., 36"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Shoe Size</label>
          <Input
            value={details.shoe_size || ""}
            onChange={(e) => onChange("shoe_size", e.target.value)}
            placeholder="e.g., UK 8"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Dress Size</label>
          <Input
            value={details.dress_size || ""}
            onChange={(e) => onChange("dress_size", e.target.value)}
            placeholder="e.g., 8"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Top Size</label>
          <Input
            value={details.top_size || ""}
            onChange={(e) => onChange("top_size", e.target.value)}
            placeholder="e.g., S, M, L"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Bottom Size</label>
          <Input
            value={details.bottom_size || ""}
            onChange={(e) => onChange("bottom_size", e.target.value)}
            placeholder="e.g., 28"
            className="border-pink-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">
            <Palette className="h-3 w-3 inline mr-1" />
            Hair Colour
          </label>
          <Input
            value={details.hair_colour || ""}
            onChange={(e) => onChange("hair_colour", e.target.value)}
            placeholder="e.g., Brown"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Hair Style</label>
          <Input
            value={details.hair_style || ""}
            onChange={(e) => onChange("hair_style", e.target.value)}
            placeholder="e.g., Long, Curly"
            className="border-pink-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-pink-800">Eye Colour</label>
          <Input
            value={details.eye_colour || ""}
            onChange={(e) => onChange("eye_colour", e.target.value)}
            placeholder="e.g., Blue"
            className="border-pink-200"
          />
        </div>
      </div>
    </div>
  );
}

function SportsFields({
  details,
  onChange,
  onArrayChange,
}: {
  details: SportsDetails;
  onChange: (field: string, value: string | number) => void;
  onArrayChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
      <h5 className="font-semibold text-green-900 flex items-center gap-2">
        <Trophy className="h-4 w-4" />
        Sports Information
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">Sport Type</label>
          <Input
            value={details.sport_type || ""}
            onChange={(e) => onChange("sport_type", e.target.value)}
            placeholder="e.g., Football, Basketball"
            className="border-green-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">Current Team</label>
          <Input
            value={details.current_team || ""}
            onChange={(e) => onChange("current_team", e.target.value)}
            placeholder="e.g., Manchester United"
            className="border-green-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">
            Positions Played (comma-separated)
          </label>
          <Input
            value={details.positions_played?.join(", ") || ""}
            onChange={(e) => onArrayChange("positions_played", e.target.value)}
            placeholder="e.g., Striker, Winger"
            className="border-green-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">
            Previous Teams (comma-separated)
          </label>
          <Input
            value={details.teams_played?.join(", ") || ""}
            onChange={(e) => onArrayChange("teams_played", e.target.value)}
            placeholder="e.g., Chelsea, Arsenal"
            className="border-green-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">Goals Scored</label>
          <Input
            type="number"
            value={details.goals_scored ?? ""}
            onChange={(e) => onChange("goals_scored", e.target.value ? parseInt(e.target.value) : "")}
            placeholder="0"
            className="border-green-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">Assists</label>
          <Input
            type="number"
            value={details.assists ?? ""}
            onChange={(e) => onChange("assists", e.target.value ? parseInt(e.target.value) : "")}
            placeholder="0"
            className="border-green-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">League</label>
          <Input
            value={details.league_played || ""}
            onChange={(e) => onChange("league_played", e.target.value)}
            placeholder="e.g., Premier League"
            className="border-green-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-green-800">Team Position</label>
          <Input
            value={details.team_position_in_league || ""}
            onChange={(e) => onChange("team_position_in_league", e.target.value)}
            placeholder="e.g., 3rd"
            className="border-green-200"
          />
        </div>
      </div>
    </div>
  );
}

function MusicFields({
  details,
  onChange,
  onArrayChange,
}: {
  details: MusicDetails;
  onChange: (field: string, value: string) => void;
  onArrayChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
      <h5 className="font-semibold text-purple-900 flex items-center gap-2">
        <Music className="h-4 w-4" />
        Music Information
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-purple-800">
            Genre (comma-separated)
          </label>
          <Input
            value={details.genre?.join(", ") || ""}
            onChange={(e) => onArrayChange("genre", e.target.value)}
            placeholder="e.g., R&B, Pop, Hip-Hop"
            className="border-purple-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-purple-800">Record Label</label>
          <Input
            value={details.record_label || ""}
            onChange={(e) => onChange("record_label", e.target.value)}
            placeholder="e.g., Universal Music"
            className="border-purple-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-purple-800">Years Active</label>
          <Input
            value={details.years_active || ""}
            onChange={(e) => onChange("years_active", e.target.value)}
            placeholder="e.g., 2015-present"
            className="border-purple-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-purple-800">
            Instruments (comma-separated)
          </label>
          <Input
            value={details.instruments?.join(", ") || ""}
            onChange={(e) => onArrayChange("instruments", e.target.value)}
            placeholder="e.g., Piano, Guitar, Vocals"
            className="border-purple-200"
          />
        </div>
      </div>
      <div className="border-t border-purple-200 pt-3 mt-3">
        <h6 className="text-sm font-medium text-purple-800 mb-2">Streaming Links</h6>
        <div className="grid grid-cols-3 gap-3">
          <Input
            value={details.streaming_links?.spotify || ""}
            onChange={(e) => onChange("streaming_links.spotify", e.target.value)}
            placeholder="Spotify URL"
            className="border-purple-200"
          />
          <Input
            value={details.streaming_links?.apple_music || ""}
            onChange={(e) => onChange("streaming_links.apple_music", e.target.value)}
            placeholder="Apple Music URL"
            className="border-purple-200"
          />
          <Input
            value={details.streaming_links?.soundcloud || ""}
            onChange={(e) => onChange("streaming_links.soundcloud", e.target.value)}
            placeholder="SoundCloud URL"
            className="border-purple-200"
          />
        </div>
      </div>
    </div>
  );
}

function ActingFields({
  details,
  onArrayChange,
}: {
  details: ActingDetails;
  onArrayChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
      <h5 className="font-semibold text-amber-900 flex items-center gap-2">
        Acting Information
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-amber-800">
            Acting Type (comma-separated)
          </label>
          <Input
            value={details.acting_type?.join(", ") || ""}
            onChange={(e) => onArrayChange("acting_type", e.target.value)}
            placeholder="e.g., Film, TV, Theatre"
            className="border-amber-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-amber-800">
            Agencies (comma-separated)
          </label>
          <Input
            value={details.agencies?.join(", ") || ""}
            onChange={(e) => onArrayChange("agencies", e.target.value)}
            placeholder="e.g., CAA, WME"
            className="border-amber-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-amber-800">
            Notable Roles (comma-separated)
          </label>
          <Input
            value={details.notable_roles?.join(", ") || ""}
            onChange={(e) => onArrayChange("notable_roles", e.target.value)}
            placeholder="e.g., Lead in Film X"
            className="border-amber-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-amber-800">
            Training (comma-separated)
          </label>
          <Input
            value={details.training?.join(", ") || ""}
            onChange={(e) => onArrayChange("training", e.target.value)}
            placeholder="e.g., RADA, Lee Strasberg"
            className="border-amber-200"
          />
        </div>
      </div>
    </div>
  );
}

function CulinaryFields({
  details,
  onArrayChange,
}: {
  details: CulinaryDetails;
  onArrayChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
      <h5 className="font-semibold text-orange-900 flex items-center gap-2">
        Culinary Information
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-orange-800">
            Cuisine Specialties (comma-separated)
          </label>
          <Input
            value={details.cuisine_specialties?.join(", ") || ""}
            onChange={(e) => onArrayChange("cuisine_specialties", e.target.value)}
            placeholder="e.g., Italian, French, Asian Fusion"
            className="border-orange-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-orange-800">
            Restaurants (comma-separated)
          </label>
          <Input
            value={details.restaurants?.join(", ") || ""}
            onChange={(e) => onArrayChange("restaurants", e.target.value)}
            placeholder="e.g., Restaurant Name"
            className="border-orange-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block text-orange-800">
            Certifications (comma-separated)
          </label>
          <Input
            value={details.certifications?.join(", ") || ""}
            onChange={(e) => onArrayChange("certifications", e.target.value)}
            placeholder="e.g., Michelin Star, Cordon Bleu"
            className="border-orange-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block text-orange-800">
            TV Appearances (comma-separated)
          </label>
          <Input
            value={details.tv_appearances?.join(", ") || ""}
            onChange={(e) => onArrayChange("tv_appearances", e.target.value)}
            placeholder="e.g., MasterChef, Hell's Kitchen"
            className="border-orange-200"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminTalentsPage() {
  const [mounted, setMounted] = useState(false);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState<Industry | "all">("all");
  const [showInactive, setShowInactive] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [passwordResetTalent, setPasswordResetTalent] = useState<{
    userId: string;
    name: string;
    email: string;
  } | null>(null);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state - using database field names
  const [formData, setFormData] = useState<Partial<Talent>>({
    name: "",
    industry: "music",
    gender: "male",
    age_group: "adult",
    profession: "",
    location: "",
    bio: "",
    tagline: "",
    skills: [],
    image_src: "",
    cover_image: "",
    featured: false,
    is_active: true,
    social_links: {},
    portfolio: [] as PortfolioItem[],
    industry_details: {},
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTalents();
    }
  }, [mounted]);

  useEffect(() => {
    let filtered = talents;

    if (!showInactive) {
      filtered = filtered.filter((talent) => talent.is_active);
    }

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
  }, [talents, searchTerm, filterIndustry, showInactive]);

  const fetchTalents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/talents?activeOnly=false");
      const data = await response.json();
      setTalents(data);
      setFilteredTalents(data);
    } catch (error) {
      console.error("Error fetching talents:", error);
      setError("Failed to load talents. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);

      const missingFields = [];
      if (!formData.name?.trim()) missingFields.push("Name");
      if (!formData.profession?.trim()) missingFields.push("Profession");
      if (!formData.bio?.trim()) missingFields.push("Bio");
      if (!formData.tagline?.trim()) missingFields.push("Tagline");
      if (!formData.image_src?.trim()) missingFields.push("Profile Image");

      if (missingFields.length > 0) {
        setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
        setSaving(false);
        return;
      }

      console.log('[Frontend] Creating new talent with fields:', Object.keys(formData));

      const response = await fetch("/api/talents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Frontend] Talent created successfully');
        await fetchTalents();
        setIsCreateDialogOpen(false);
        resetForm();

        if (data.user && data.user.password) {
          setNewUserCredentials({
            name: formData.name || "Unknown",
            email: data.user.email,
            password: data.user.password,
          });
          setIsCredentialsDialogOpen(true);
        } else if (data.warning) {
          setSuccess(
            `Talent profile created with warning:\n${data.warning}`
          );
          setTimeout(() => setSuccess(null), 8000);
        } else {
          setSuccess("Talent profile created successfully!");
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const data = await response.json();
        console.error('[Frontend] Failed to create talent:', {
          status: response.status,
          error: data.error,
          details: data.details
        });

        let errorMessage = data.error || "Failed to create talent profile";
        if (data.details) {
          errorMessage += `\n\nDetails: ${data.details}`;
        }
        errorMessage += "\n\nPlease check all required fields.";

        setError(errorMessage);
      }
    } catch (error) {
      console.error("[Frontend] Error creating talent:", error);
      const errorMessage = error instanceof Error
        ? `Network error: ${error.message}`
        : "Failed to create talent profile. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTalent) return;

    try {
      setSaving(true);
      setError(null);

      console.log('[Frontend] Updating talent:', selectedTalent.id);
      console.log('[Frontend] Form data fields:', Object.keys(formData));

      const response = await fetch(`/api/talents/${selectedTalent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log('[Frontend] Talent updated successfully');
        await fetchTalents();
        setIsEditDialogOpen(false);
        setSelectedTalent(null);
        resetForm();
        setSuccess("Talent profile updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        console.error('[Frontend] Update failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
          hint: data.hint
        });

        let errorMessage = data.error || "Failed to update talent profile";
        if (data.details) {
          errorMessage += `\n\nDetails: ${data.details}`;
        }
        if (data.hint) {
          errorMessage += `\n\n${data.hint}`;
        }

        setError(errorMessage);
      }
    } catch (error) {
      console.error("[Frontend] Error updating talent:", error);
      const errorMessage = error instanceof Error
        ? `Network error: ${error.message}`
        : "Failed to update talent profile. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTalent) return;

    try {
      setSaving(true);
      setError(null);

      console.log(`[Frontend] Deleting talent ${selectedTalent.id}`);

      const response = await fetch(`/api/talents/${selectedTalent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log('[Frontend] Talent deleted successfully');
        await fetchTalents();
        setIsDeleteDialogOpen(false);
        setSelectedTalent(null);
        setSuccess("Talent profile deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        console.error('[Frontend] Failed to delete talent:', {
          status: response.status,
          error: data.error,
          details: data.details
        });

        let errorMessage = data.error || "Failed to delete talent profile";
        if (data.details) {
          errorMessage += `\n\nDetails: ${data.details}`;
        }

        setError(errorMessage);
      }
    } catch (error) {
      console.error("[Frontend] Error deleting talent:", error);
      const errorMessage = error instanceof Error
        ? `Network error: ${error.message}`
        : "Failed to delete talent profile. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (talent: Talent) => {
    try {
      console.log(`[Frontend] Toggling featured status for talent ${talent.id} to ${!talent.featured}`);

      const response = await fetch(`/api/talents/${talent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !talent.featured }),
      });

      if (response.ok) {
        console.log('[Frontend] Featured status updated successfully');
        await fetchTalents();
        setSuccess(`Talent ${!talent.featured ? 'marked as featured' : 'removed from featured'}!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        console.error('[Frontend] Failed to toggle featured:', {
          status: response.status,
          error: data.error,
          details: data.details
        });

        const errorMessage = data.error
          ? `Failed to update featured status: ${data.error}`
          : "Failed to update featured status. Please try again.";
        setError(errorMessage);
      }
    } catch (error) {
      console.error("[Frontend] Error toggling featured:", error);
      const errorMessage = error instanceof Error
        ? `Network error while updating featured status: ${error.message}`
        : "Failed to update featured status. Please check your connection.";
      setError(errorMessage);
    }
  };

  const toggleActive = async (talent: Talent) => {
    try {
      console.log(`[Frontend] Toggling active status for talent ${talent.id} to ${!talent.is_active}`);

      const response = await fetch(`/api/talents/${talent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !talent.is_active }),
      });

      if (response.ok) {
        console.log('[Frontend] Active status updated successfully');
        await fetchTalents();
        setSuccess(`Talent ${!talent.is_active ? 'activated' : 'deactivated'}!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        console.error('[Frontend] Failed to toggle active:', {
          status: response.status,
          error: data.error,
          details: data.details
        });

        const errorMessage = data.error
          ? `Failed to update active status: ${data.error}`
          : "Failed to update active status. Please try again.";
        setError(errorMessage);
      }
    } catch (error) {
      console.error("[Frontend] Error toggling active:", error);
      const errorMessage = error instanceof Error
        ? `Network error while updating active status: ${error.message}`
        : "Failed to update active status. Please check your connection.";
      setError(errorMessage);
    }
  };

  const openEditDialog = (talent: Talent) => {
    setSelectedTalent(talent);
    setFormData({
      ...talent,
      portfolio: Array.isArray(talent.portfolio) ? talent.portfolio : [],
      industry_details: talent.industry_details || {},
    });
    setError(null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (talent: Talent) => {
    setSelectedTalent(talent);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const openPasswordResetDialog = async (talent: Talent) => {
    try {
      const response = await fetch(`/api/users?talentId=${talent.id}`);
      if (!response.ok) {
        setError("Could not find user account for this talent.");
        return;
      }

      const users = await response.json();
      if (users.length === 0) {
        setError("No user account found for this talent. User may not have been created yet.");
        return;
      }

      const user = users[0];
      setPasswordResetTalent({
        userId: user.id,
        name: talent.name,
        email: user.email,
      });
      setIsPasswordResetDialogOpen(true);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to load user information.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "music",
      gender: "male",
      age_group: "adult",
      profession: "",
      location: "",
      bio: "",
      tagline: "",
      skills: [],
      image_src: "",
      cover_image: "",
      featured: false,
      is_active: true,
      social_links: {},
      portfolio: [] as PortfolioItem[],
      industry_details: {},
    });
  };

  const handleFormChange = (
    field: string,
    value: string | boolean | string[] | PortfolioItem[] | IndustryDetails | undefined
  ) => {
    if (field.startsWith("social_links.")) {
      const socialField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        social_links: {
          ...prev.social_links,
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

  // Handler for industry details fields
  const handleIndustryDetailsChange = (field: string, value: string | number | string[]) => {
    setFormData((prev) => {
      const currentDetails = prev.industry_details || {};

      // Handle nested streaming_links for music
      if (field.startsWith("streaming_links.")) {
        const streamingField = field.split(".")[1];
        const musicDetails = currentDetails as MusicDetails;
        return {
          ...prev,
          industry_details: {
            ...currentDetails,
            streaming_links: {
              ...musicDetails.streaming_links,
              [streamingField]: value,
            },
          },
        };
      }

      return {
        ...prev,
        industry_details: {
          ...currentDetails,
          [field]: value,
        },
      };
    });
  };

  // Handler for array fields in industry details
  const handleIndustryDetailsArrayChange = (field: string, value: string) => {
    const array = value.split(",").map((s) => s.trim()).filter(Boolean);
    handleIndustryDetailsChange(field, array);
  };

  const handleSkillsChange = (skillsString: string) => {
    const skills = skillsString.split(",").map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, skills }));
  };

  if (!mounted) {
    return (
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-white">Loading...</div>
            </div>
          </div>
        </section>
      </SimpleMainLayout>
    );
  }

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
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
                  Add New Talent
                </Button>
              </div>
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

              {/* Show inactive toggle */}
              <Button
                variant={showInactive ? "default" : "outline"}
                onClick={() => setShowInactive((v) => !v)}
                className="flex items-center gap-2"
              >
                {showInactive ? (
                  <>
                    <Eye className="h-4 w-4" />
                    Show All
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Inactive
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Success/Error Feedback */}
        {(error || success) && (
          <section className="container px-4 mx-auto mt-4">
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-2 whitespace-pre-line">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded mb-2 whitespace-pre-line font-mono text-sm">
                {success}
              </div>
            )}
          </section>
        )}

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
                    className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative ${
                      !talent.is_active ? "opacity-60" : ""
                    }`}
                  >
                    {/* Talent Image */}
                    {talent.image_src && (
                      <div className="relative h-64 bg-gray-100">
                        <img
                          src={talent.image_src}
                          alt={talent.name}
                          className="w-full h-full object-cover"
                        />
                        {talent.featured && (
                          <Badge className="absolute top-2 right-2 bg-gold">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                        {!talent.is_active && (
                          <Badge className="absolute top-2 left-2 bg-gray-400 text-white">
                            Inactive
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
                      <div className="flex gap-2 flex-wrap">
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
                          onClick={() => openPasswordResetDialog(talent)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Reset user password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(talent)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={talent.featured ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleFeatured(talent)}
                          className="flex items-center gap-1"
                          title={talent.featured ? "Remove from featured" : "Mark as featured"}
                        >
                          {talent.featured ? (
                            <>
                              <StarOff className="h-4 w-4" />
                              Unfeature
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4" />
                              Feature
                            </>
                          )}
                        </Button>
                        <Button
                          variant={talent.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleActive(talent)}
                          className="flex items-center gap-1"
                          title={talent.is_active ? "Deactivate" : "Activate"}
                        >
                          {talent.is_active ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Activate
                            </>
                          )}
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
                    value={formData.age_group}
                    onValueChange={(value) => handleFormChange("age_group", value)}
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

              {/* Industry-specific fields */}
              {formData.industry === "modeling" && (
                <ModelingFields
                  details={formData.industry_details as ModelingDetails || {}}
                  onChange={handleIndustryDetailsChange}
                />
              )}
              {formData.industry === "sports" && (
                <SportsFields
                  details={formData.industry_details as SportsDetails || {}}
                  onChange={handleIndustryDetailsChange}
                  onArrayChange={handleIndustryDetailsArrayChange}
                />
              )}
              {formData.industry === "music" && (
                <MusicFields
                  details={formData.industry_details as MusicDetails || {}}
                  onChange={handleIndustryDetailsChange}
                  onArrayChange={handleIndustryDetailsArrayChange}
                />
              )}
              {formData.industry === "acting" && (
                <ActingFields
                  details={formData.industry_details as ActingDetails || {}}
                  onArrayChange={handleIndustryDetailsArrayChange}
                />
              )}
              {formData.industry === "culinary" && (
                <CulinaryFields
                  details={formData.industry_details as CulinaryDetails || {}}
                  onArrayChange={handleIndustryDetailsArrayChange}
                />
              )}

              {/* Industry Validation Warnings */}
              {formData.industry && (
                <IndustryValidationWarnings
                  industry={formData.industry}
                  details={formData.industry_details}
                />
              )}

              {/* Image Upload */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Profile Image *</h4>
                <ImageUpload
                  value={formData.image_src}
                  onChange={(url) => handleFormChange("image_src", url)}
                  type="talent"
                />

                {/* Quick Test Images */}
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-bold text-purple-900 mb-2">⚡ Quick Test - Click to use:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFormChange("image_src", "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&q=80")}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-purple-100 border border-purple-300 rounded text-purple-700 transition-colors"
                    >
                      🎵 Music Artist
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormChange("image_src", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80")}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-purple-100 border border-purple-300 rounded text-purple-700 transition-colors"
                    >
                      👤 Portrait
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Cover Image (Landscape)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Upload a wide landscape image for the talent's profile banner (recommended: 1920x600px or similar 16:5 ratio)
                </p>
                <ImageUpload
                  value={formData.cover_image}
                  onChange={(url) => handleFormChange("cover_image", url)}
                  type="talent"
                />

                {/* Quick Test Images for Cover */}
                <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-bold text-green-900 mb-2">⚡ Quick Test - Click to use landscape cover:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFormChange("cover_image", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80")}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-green-100 border border-green-300 rounded text-green-700 transition-colors"
                    >
                      🎵 Concert Stage
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormChange("cover_image", "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1920&q=80")}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-green-100 border border-green-300 rounded text-green-700 transition-colors"
                    >
                      🎹 Music Studio
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Social Links</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Instagram URL"
                    value={formData.social_links?.instagram || ""}
                    onChange={(e) => handleFormChange("social_links.instagram", e.target.value)}
                  />
                  <Input
                    placeholder="Twitter URL"
                    value={formData.social_links?.twitter || ""}
                    onChange={(e) => handleFormChange("social_links.twitter", e.target.value)}
                  />
                  <Input
                    placeholder="YouTube URL"
                    value={formData.social_links?.youtube || ""}
                    onChange={(e) => handleFormChange("social_links.youtube", e.target.value)}
                  />
                  <Input
                    placeholder="Website URL"
                    value={formData.social_links?.website || ""}
                    onChange={(e) => handleFormChange("social_links.website", e.target.value)}
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
              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active !== false}
                  onChange={(e) => handleFormChange("is_active", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm">
                  Active (visible on site)
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
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={isCreateDialogOpen ? handleCreate : handleUpdate}
                className="bg-gold hover:bg-gold/90 text-white"
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving
                  ? isCreateDialogOpen
                    ? "Adding..."
                    : "Saving..."
                  : isCreateDialogOpen
                  ? "Add Talent"
                  : "Save Changes"}
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

            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-2">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedTalent(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {saving ? "Deleting..." : "Delete Talent"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credentials Dialog */}
        {newUserCredentials && (
          <CredentialsDialog
            open={isCredentialsDialogOpen}
            onOpenChange={setIsCredentialsDialogOpen}
            credentials={newUserCredentials}
          />
        )}

        {/* Password Reset Dialog */}
        {passwordResetTalent && (
          <PasswordResetDialog
            open={isPasswordResetDialogOpen}
            onOpenChange={setIsPasswordResetDialogOpen}
            userId={passwordResetTalent.userId}
            userName={passwordResetTalent.name}
            userEmail={passwordResetTalent.email}
            onSuccess={() => {
              setSuccess("Password reset successfully!");
              setTimeout(() => setSuccess(null), 3000);
            }}
          />
        )}
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
