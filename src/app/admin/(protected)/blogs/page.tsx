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
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Image as ImageIcon,
  Video,
  Eye,
  EyeOff,
  Star,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { BlogPost, CreateBlogPostRequest, UpdateBlogPostRequest } from "@/lib/db/types";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

// Blog categories
const BLOG_CATEGORIES = [
  "Music",
  "Modeling",
  "Sports",
  "Acting",
  "Culinary",
  "Industry News",
  "Interviews",
  "Behind the Scenes",
  "Tips & Advice",
  "Events",
];

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateBlogPostRequest>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "VersaTalent Team",
    category: "",
    image_url: "",
    video_url: "",
    tags: [],
    featured: false,
    is_published: true,
  });

  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts
  useEffect(() => {
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter((post) => post.category === filterCategory);
    }

    if (filterStatus !== "all") {
      if (filterStatus === "published") {
        filtered = filtered.filter((post) => post.is_published);
      } else if (filterStatus === "draft") {
        filtered = filtered.filter((post) => !post.is_published);
      } else if (filterStatus === "featured") {
        filtered = filtered.filter((post) => post.featured);
      }
    }

    setFilteredPosts(filtered);
  }, [posts, searchTerm, filterCategory, filterStatus]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blogs?publishedOnly=false");
      const data = await response.json();
      setPosts(data);
      setFilteredPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.title || !formData.content) {
        setError("Title and content are required");
        return;
      }

      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchPosts();
        setIsCreateDialogOpen(false);
        resetForm();
        setSuccess("Blog post created successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create blog post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Failed to create blog post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPost) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/blogs/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchPosts();
        setIsEditDialogOpen(false);
        setSelectedPost(null);
        resetForm();
        setSuccess("Blog post updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update blog post");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      setError("Failed to update blog post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/blogs/${selectedPost.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPosts();
        setIsDeleteDialogOpen(false);
        setSelectedPost(null);
        setSuccess("Blog post deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete blog post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      setError("Failed to delete blog post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      author: post.author,
      category: post.category || "",
      image_url: post.image_url || "",
      video_url: post.video_url || "",
      tags: post.tags || [],
      featured: post.featured,
      is_published: post.is_published,
    });
    setError(null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      author: "VersaTalent Team",
      category: "",
      image_url: "",
      video_url: "",
      tags: [],
      featured: false,
      is_published: true,
    });
  };

  const handleFormChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const generateSlug = () => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 200);
      setFormData((prev) => ({ ...prev, slug }));
    }
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
                  Blog <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">
                  Create and manage blog posts with images and videos
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
                  Create Post
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
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {BLOG_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Posts List */}
        <section className="py-8">
          <div className="container px-4 mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading posts...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No blog posts found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm || filterCategory !== "all" || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first blog post to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Post Image */}
                    {post.image_url ? (
                      <div className="relative h-48 bg-gray-100">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {post.featured && (
                            <Badge className="bg-gold">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {!post.is_published && (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </div>
                        {post.video_url && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="outline" className="bg-white/90">
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {post.featured && (
                            <Badge className="bg-gold">Featured</Badge>
                          )}
                          {!post.is_published && (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Post Details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 flex-1 line-clamp-2">
                          {post.title}
                        </h3>
                      </div>

                      {post.excerpt && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}

                      {/* Post Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gold" />
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Not published"}
                        </div>
                        {post.category && (
                          <Badge variant="outline" className="text-gold border-gold">
                            {post.category}
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {post.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {post.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{post.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(post)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(post)}
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

        {/* Create/Edit Post Dialog */}
        <Dialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedPost(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isCreateDialogOpen ? "Create New Blog Post" : "Edit Blog Post"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for your blog post
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="Enter blog post title"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-sm font-medium mb-2 block">Slug</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.slug}
                    onChange={(e) => handleFormChange("slug", e.target.value)}
                    placeholder="url-friendly-slug"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={generateSlug}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate from title
                </p>
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-sm font-medium mb-2 block">Excerpt</label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => handleFormChange("excerpt", e.target.value)}
                  placeholder="Brief summary of the post..."
                  rows={2}
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium mb-2 block">Content *</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => handleFormChange("content", e.target.value)}
                  placeholder="Write your blog post content here... (Supports Markdown)"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Author */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Author</label>
                  <Input
                    value={formData.author}
                    onChange={(e) => handleFormChange("author", e.target.value)}
                    placeholder="Author name"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={formData.category || ""}
                    onValueChange={(value) => handleFormChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Featured Image */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gold" />
                  Featured Image
                </h4>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) => handleFormChange("image_url", url || "")}
                  type="blog"
                />
              </div>

              {/* Video URL */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-gold" />
                  Video (Optional)
                </h4>
                <Input
                  value={formData.video_url}
                  onChange={(e) => handleFormChange("video_url", e.target.value)}
                  placeholder="YouTube or Vimeo URL"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a YouTube or Vimeo video URL to embed in your post
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
                  placeholder="music, interview, behind-the-scenes"
                />
              </div>

              {/* Options */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured || false}
                    onChange={(e) => handleFormChange("featured", e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="featured" className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-gold" />
                    Featured post (displayed prominently)
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
                  <label htmlFor="is_published" className="text-sm flex items-center gap-2">
                    {formData.is_published ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    Published (visible on website)
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
                  setSelectedPost(null);
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
                    {isCreateDialogOpen ? "Create Post" : "Save Changes"}
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
              <DialogTitle>Delete Blog Post</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this blog post? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {selectedPost && (
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <p className="font-semibold text-gray-900">{selectedPost.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  By {selectedPost.author} •{" "}
                  {selectedPost.published_at
                    ? new Date(selectedPost.published_at).toLocaleDateString("en-GB")
                    : "Draft"}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedPost(null);
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
                    Delete Post
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
