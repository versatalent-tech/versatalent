"use client";

import { useState } from "react";
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
  Image as ImageIcon,
  Video,
  X,
  Save,
  ExternalLink,
} from "lucide-react";
import type { PortfolioItem } from "@/lib/data/talents";
import { ImageUpload } from "./ImageUpload";

interface PortfolioManagerProps {
  portfolio: PortfolioItem[];
  onChange: (portfolio: PortfolioItem[]) => void;
}

export function PortfolioManager({ portfolio, onChange }: PortfolioManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [formData, setFormData] = useState<Partial<PortfolioItem>>({
    title: "",
    description: "",
    type: "image",
    url: "",
    thumbnailUrl: "",
    category: "",
    date: "",
    photographer: "",
    location: "",
    client: "",
    featured: false,
    tags: [],
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "image",
      url: "",
      thumbnailUrl: "",
      category: "",
      date: "",
      photographer: "",
      location: "",
      client: "",
      featured: false,
      tags: [],
    });
  };

  const handleAdd = () => {
    const newItem: PortfolioItem = {
      id: Date.now().toString(),
      title: formData.title || "",
      description: formData.description || "",
      type: formData.type || "image",
      url: formData.url || "",
      thumbnailUrl: formData.thumbnailUrl,
      category: formData.category,
      date: formData.date,
      photographer: formData.photographer,
      location: formData.location,
      client: formData.client,
      featured: formData.featured,
      tags: formData.tags,
    };

    onChange([...portfolio, newItem]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (selectedIndex === -1) return;

    const updatedPortfolio = [...portfolio];
    updatedPortfolio[selectedIndex] = {
      ...formData,
      id: selectedItem?.id || Date.now().toString(),
    } as PortfolioItem;

    onChange(updatedPortfolio);
    setIsEditDialogOpen(false);
    setSelectedItem(null);
    setSelectedIndex(-1);
    resetForm();
  };

  const handleDelete = () => {
    if (selectedIndex === -1) return;

    const updatedPortfolio = portfolio.filter((_, index) => index !== selectedIndex);
    onChange(updatedPortfolio);
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
    setSelectedIndex(-1);
  };

  const openEditDialog = (item: PortfolioItem, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
    setFormData(item);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (item: PortfolioItem, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
    setIsDeleteDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string | boolean | string[] | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Portfolio ({portfolio.length} items)</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {portfolio.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">No portfolio items yet</p>
          <p className="text-xs text-gray-500 mb-4">
            Add photos and videos to showcase this talent's work
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolio.map((item, index) => (
            <div
              key={item.id}
              className="relative group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview */}
              <div className="relative aspect-square bg-gray-100">
                {item.type === "image" ? (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge
                    variant={item.type === "image" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {item.type}
                  </Badge>
                  {item.featured && (
                    <Badge className="bg-gold text-xs">Featured</Badge>
                  )}
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditDialog(item, index)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openDeleteDialog(item, index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.category && (
                  <p className="text-xs text-gray-500">{item.category}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedItem(null);
            setSelectedIndex(-1);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAddDialogOpen ? "Add Portfolio Item" : "Edit Portfolio Item"}
            </DialogTitle>
            <DialogDescription>
              Add photos or videos to showcase the talent's work
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type *</label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleFormChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Info */}
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Portfolio Item Title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Describe this work..."
                rows={3}
              />
            </div>

            {/* Media Upload/URL */}
            {formData.type === "image" ? (
              <div>
                <label className="text-sm font-medium mb-2 block">Image *</label>
                <ImageUpload
                  value={formData.url}
                  onChange={(url) => handleFormChange("url", url)}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Video URL * (YouTube/Vimeo Embed)
                </label>
                <Input
                  value={formData.url}
                  onChange={(e) => handleFormChange("url", e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the embed URL from YouTube or Vimeo
                </p>
              </div>
            )}

            {/* Thumbnail for Videos */}
            {formData.type === "video" && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Video Thumbnail (Optional)
                </label>
                <ImageUpload
                  value={formData.thumbnailUrl || ""}
                  onChange={(url) => handleFormChange("thumbnailUrl", url)}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleFormChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Film">Film</SelectItem>
                    <SelectItem value="Print">Print</SelectItem>
                    <SelectItem value="Editorial">Editorial</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  value={formData.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Photographer/Videographer</label>
                <Input
                  value={formData.photographer}
                  onChange={(e) => handleFormChange("photographer", e.target.value)}
                  placeholder="Name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Client/Project</label>
              <Input
                value={formData.client}
                onChange={(e) => handleFormChange("client", e.target.value)}
                placeholder="Client or project name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags?.join(", ") || ""}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="Fashion, Editorial, Studio"
              />
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="portfolio-featured"
                checked={formData.featured || false}
                onChange={(e) => handleFormChange("featured", e.target.checked)}
                className="rounded"
              />
              <label htmlFor="portfolio-featured" className="text-sm">
                Featured Item (display prominently in portfolio)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedItem(null);
                setSelectedIndex(-1);
                resetForm();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={isAddDialogOpen ? handleAdd : handleUpdate}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isAddDialogOpen ? "Add Item" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="bg-gray-50 rounded-lg p-4 my-4">
              <div className="flex items-center gap-3">
                {selectedItem.type === "image" ? (
                  <img
                    src={selectedItem.thumbnailUrl || selectedItem.url}
                    alt={selectedItem.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-900 rounded flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{selectedItem.title}</p>
                  <p className="text-sm text-gray-600">{selectedItem.category}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedItem(null);
                setSelectedIndex(-1);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
