import type { ReactNode } from "react";
import { isHtmlContent } from "@/lib/blog";
import { SanitizedHtml } from "@/components/blog/SanitizedHtml";

// [text](url) markdown links, or bare http(s):// / www. URLs
const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+)/gi;

function PostLink({ href, children }: { href: string; children: ReactNode }) {
  const url = href.startsWith("www.") ? `https://${href}` : href;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-words">
      {children}
    </a>
  );
}

/** A line of plain text with its URLs turned into links */
function linkify(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of line.matchAll(LINK_PATTERN)) {
    const [whole, label, labelledUrl, bareUrl] = match;
    const start = match.index;
    let end = start + whole.length;
    let link: ReactNode;

    if (labelledUrl) {
      link = <PostLink key={start} href={labelledUrl}>{label}</PostLink>;
    } else {
      // Leave trailing punctuation (end of sentence, closing bracket) outside the link
      const url = bareUrl.replace(/[.,;:!?'")\]]+$/, "");
      end = start + url.length;
      link = <PostLink key={start} href={url}>{url}</PostLink>;
    }

    if (start > last) parts.push(line.slice(last, start));
    parts.push(link);
    last = end;
  }

  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

/**
 * Post body. Plain-text posts (as typed in the admin) are split into
 * paragraphs on blank lines, with single line breaks kept and URLs made
 * clickable; HTML posts are
 * sanitised and rendered as HTML.
 */
export function BlogBody({ content }: { content: string }) {
  if (isHtmlContent(content)) {
    return <SanitizedHtml html={content} className="text-gray-700" />;
  }

  const paragraphs = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="text-gray-700">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-4 leading-relaxed">
          {paragraph.split("\n").map((line, j, lines) => (
            <span key={j}>
              {linkify(line)}
              {j < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
