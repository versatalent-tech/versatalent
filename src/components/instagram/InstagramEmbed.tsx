"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Instagram } from "lucide-react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT = "https://www.instagram.com/embed.js";
let scriptLoading: Promise<void> | null = null;

/** Loads Instagram's embed script once, the first time a post comes into view */
function loadEmbedScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = EMBED_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoading = null; // let a later post try again
        reject(new Error("Instagram embed script failed to load"));
      };
      document.body.appendChild(script);
    });
  }
  return scriptLoading;
}

/**
 * One Instagram post or reel, shown with Instagram's own embed (real image,
 * caption and link). Nothing is loaded from Instagram until the post is about
 * to scroll into view. The blockquote is built outside React because
 * Instagram's script replaces it with its own iframe.
 */
export function InstagramEmbed({ permalink }: { permalink: string }) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "300px 0px" });
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = holder.current;
    if (!inView || !box) return;

    const quote = document.createElement("blockquote");
    quote.className = "instagram-media";
    quote.setAttribute("data-instgrm-captioned", "");
    quote.setAttribute("data-instgrm-permalink", permalink);
    quote.setAttribute("data-instgrm-version", "14");
    quote.style.cssText = "background:#fff;border:0;margin:0;max-width:540px;min-width:280px;width:100%;";
    const link = document.createElement("a");
    link.href = permalink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View this post on Instagram";
    quote.appendChild(link);
    box.replaceChildren(quote);

    loadEmbedScript()
      .then(() => window.instgrm?.Embeds.process())
      .catch(() => setFailed(true));
  }, [inView, permalink]);

  return (
    <div ref={ref} className="flex justify-center min-h-[480px] rounded-lg bg-gray-50">
      {failed ? (
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gold"
        >
          <Instagram className="h-8 w-8" />
          View this post on Instagram
        </a>
      ) : (
        <div ref={holder} className="w-full flex justify-center" />
      )}
    </div>
  );
}
