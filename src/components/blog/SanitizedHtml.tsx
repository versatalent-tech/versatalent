"use client";

import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";

/**
 * Renders HTML post content after sanitising it in the browser
 * (DOMPurify needs a DOM, so this renders nothing on the server).
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState("");

  useEffect(() => {
    setClean(sanitizeHtml(html));
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
