"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { InstagramEmbed } from "./InstagramEmbed";
import type { PublicInstagramPost } from "@/lib/instagram/types";

type InstagramSectionProps =
  | { homepage: true; talentId?: never; instagramUrl?: never }
  | { homepage?: false; talentId: string; instagramUrl?: string | null };

/**
 * Featured Instagram posts: the homepage selection, or one talent's posts on
 * their profile. Shows nothing when there are no posts (or they can't load).
 */
export function InstagramSection(props: InstagramSectionProps) {
  const [posts, setPosts] = useState<PublicInstagramPost[]>([]);
  const query = props.homepage ? "homepage=1" : `talent=${encodeURIComponent(props.talentId)}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/posts?${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.success && Array.isArray(body.data)) setPosts(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (posts.length === 0) return null;

  // Instagram's embeds are never narrower than 326px, so fit as many columns as that allows
  const grid = (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,326px),1fr))] gap-6">
      {posts.map((post) => (
        <div key={post.id} className="space-y-2">
          <InstagramEmbed permalink={post.permalink} />
          {props.homepage && (
            <p className="text-sm text-center text-gray-600">
              {post.talent ? (
                <Link href={`/talents/${post.talent.id}`} className="hover:text-gold">
                  {post.talent.name}
                </Link>
              ) : (
                "VersaTalent"
              )}
              {" · "}
              <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                View on Instagram
              </a>
            </p>
          )}
        </div>
      ))}
    </div>
  );

  if (props.homepage) {
    return (
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Latest from our <span className="text-gold">talent</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              What our artists are sharing on Instagram right now
            </p>
          </div>
          {grid}
        </div>
      </section>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Instagram className="h-6 w-6 text-gold" />
          On Instagram
        </h2>
        {props.instagramUrl && (
          <a
            href={props.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gold"
          >
            Follow on Instagram
          </a>
        )}
      </div>
      {grid}
    </div>
  );
}
