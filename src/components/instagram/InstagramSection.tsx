"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Instagram } from "lucide-react";
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

  const row = (
    <PostRow>
      {posts.map((post) => (
        <div key={post.id} className="w-[326px] max-w-[85vw] shrink-0 snap-start space-y-2">
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
    </PostRow>
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
          {row}
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
      {row}
    </div>
  );
}

/**
 * The posts in a single row that scrolls sideways, so they take up one card's
 * height on the page however many there are. Cards are 326px wide, the
 * narrowest Instagram's embeds allow. Arrows appear when there's more to see.
 */
function PostRow({ children }: { children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  const update = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setCanScroll({
      back: el.scrollLeft > 4,
      forward: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    update();
    // Embeds change size as Instagram loads them
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [update, children]);

  const scroll = (direction: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow = "absolute top-[200px] -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-gold";

  return (
    <div className="relative">
      {canScroll.back && (
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous posts" className={`${arrow} -left-3`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div
        ref={row}
        onScroll={update}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:thin]"
      >
        {children}
      </div>
      {canScroll.forward && (
        <button type="button" onClick={() => scroll(1)} aria-label="More posts" className={`${arrow} -right-3`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
