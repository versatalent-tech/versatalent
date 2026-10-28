"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Instagram, Loader2, Plus, Trash2 } from "lucide-react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { InstagramEmbed } from "@/components/instagram/InstagramEmbed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InstagramPost } from "@/lib/instagram/types";

// The Select needs a value for "no talent"
const AGENCY = "agency";

interface TalentOption {
  id: string;
  name: string;
}

const KIND_LABELS: Record<InstagramPost["kind"], string> = { p: "Post", reel: "Reel", tv: "Video" };

export default function InstagramAdminPage() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [talents, setTalents] = useState<TalentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [owner, setOwner] = useState<string>(AGENCY);
  const [onHomepage, setOnHomepage] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewIds, setPreviewIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRes, talentRes] = await Promise.all([
        fetch("/api/admin/instagram/posts", { cache: "no-store" }),
        fetch("/api/talents?activeOnly=false", { cache: "no-store" }),
      ]);
      const body = await postRes.json();
      if (!body.success) throw new Error(body.error);
      setPosts(body.data);
      const talentList = await talentRes.json();
      if (Array.isArray(talentList)) {
        setTalents(
          talentList
            .map((t: TalentOption) => ({ id: t.id, name: t.name }))
            .sort((a: TalentOption, b: TalentOption) => a.name.localeCompare(b.name))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Instagram posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // VersaTalent's own posts first, then each talent's, in display order
  const groups = useMemo(() => {
    const byOwner = new Map<string, { title: string; posts: InstagramPost[] }>();
    for (const post of posts) {
      const key = post.talent?.id ?? AGENCY;
      if (!byOwner.has(key)) byOwner.set(key, { title: post.talent?.name ?? "VersaTalent", posts: [] });
      byOwner.get(key)!.posts.push(post);
    }
    return [...byOwner.entries()].map(([key, group]) => ({ key, ...group }));
  }, [posts]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    setAddError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, talent_id: owner === AGENCY ? null : owner, on_homepage: onHomepage }),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setPosts(body.data);
      setUrl("");
      setNotice(body.message);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add the post");
    } finally {
      setAdding(false);
    }
  };

  const change = async (post: InstagramPost, changes: Record<string, unknown>) => {
    setBusyId(post.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/instagram/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setPosts(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post: InstagramPost) => {
    if (!window.confirm("Take this post off the website? It stays on Instagram.")) return;
    setBusyId(post.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/instagram/posts/${post.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!body.success) throw new Error(body.error);
      setPosts(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove the post");
    } finally {
      setBusyId(null);
    }
  };

  const togglePreview = (id: string) => {
    setPreviewIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        <div className="bg-gray-50 min-h-screen py-8">
          <div className="container px-4 mx-auto max-w-5xl">
            <AdminBackLink tone="light" />
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Instagram className="h-6 w-6 text-gold" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Instagram posts</h1>
            </div>
            <p className="text-gray-600 mb-8">
              Choose the posts and reels shown on the website: on each talent&apos;s profile, and on the homepage (up to
              6). They appear as Instagram&apos;s own embeds, and changes show on the site within a few minutes.
            </p>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Add a post</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={add} className="space-y-4">
                  <div>
                    <label htmlFor="instagram-url" className="text-sm font-medium text-gray-700">
                      Link to the post or reel
                    </label>
                    <Input
                      id="instagram-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.instagram.com/p/…"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      On Instagram, open the post, tap ⋯ then &quot;Copy link&quot;. The post must be public.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="sm:w-64">
                      <label className="text-sm font-medium text-gray-700">Whose post</label>
                      <Select value={owner} onValueChange={setOwner}>
                        <SelectTrigger className="mt-1" aria-label="Whose post">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AGENCY}>VersaTalent</SelectItem>
                          {talents.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 sm:pb-2">
                      <Switch checked={onHomepage} onCheckedChange={setOnHomepage} aria-label="Show on the homepage" />
                      Show on the homepage
                    </label>
                    <Button type="submit" disabled={adding || !url.trim()} className="sm:ml-auto">
                      {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Add post
                    </Button>
                  </div>
                  {addError && <p className="text-sm text-red-600">{addError}</p>}
                  {notice && <p className="text-sm text-green-700">{notice}</p>}
                </form>
              </CardContent>
            </Card>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading posts…
              </div>
            ) : groups.length === 0 ? (
              <p className="text-center py-12 text-gray-500">No posts yet. Add one above.</p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <Card key={group.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{group.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-gray-200">
                        {group.posts.map((post, index) => {
                          const busy = busyId === post.id;
                          return (
                            <li key={post.id} className="py-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="outline">{KIND_LABELS[post.kind]}</Badge>
                                <a
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-sm text-gray-800 hover:text-gold inline-flex items-center gap-1"
                                >
                                  {post.shortcode}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                {!post.is_visible && <Badge variant="secondary">Hidden</Badge>}
                                <div className="flex items-center gap-1 ml-auto">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy || index === 0}
                                    onClick={() => change(post, { move: "up" })}
                                    aria-label="Move up"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy || index === group.posts.length - 1}
                                    onClick={() => change(post, { move: "down" })}
                                    aria-label="Move down"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => togglePreview(post.id)}>
                                    {previewIds.has(post.id) ? "Hide preview" : "Preview"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => remove(post)}
                                    aria-label="Remove"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3 text-sm text-gray-700">
                                <label className="flex items-center gap-2">
                                  <Switch
                                    checked={post.on_homepage}
                                    disabled={busy}
                                    onCheckedChange={(checked) => change(post, { on_homepage: checked })}
                                    aria-label="Show on the homepage"
                                  />
                                  Homepage
                                </label>
                                <label className="flex items-center gap-2">
                                  <Switch
                                    checked={post.is_visible}
                                    disabled={busy}
                                    onCheckedChange={(checked) => change(post, { is_visible: checked })}
                                    aria-label="Shown on the website"
                                  />
                                  {post.is_visible ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Eye className="h-4 w-4" /> Shown
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      <EyeOff className="h-4 w-4" /> Hidden everywhere
                                    </span>
                                  )}
                                </label>
                                <div className="flex items-center gap-2">
                                  <span>Belongs to</span>
                                  <Select
                                    value={post.talent?.id ?? AGENCY}
                                    disabled={busy}
                                    onValueChange={(value) => change(post, { talent_id: value === AGENCY ? null : value })}
                                  >
                                    <SelectTrigger className="h-8 w-48" aria-label="Belongs to">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={AGENCY}>VersaTalent</SelectItem>
                                      {talents.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {busy && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                              </div>

                              {previewIds.has(post.id) && (
                                <div className="mt-4 max-w-md">
                                  <InstagramEmbed permalink={post.permalink} />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
