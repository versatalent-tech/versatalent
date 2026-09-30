import { isHtmlContent } from "@/lib/blog";
import { SanitizedHtml } from "@/components/blog/SanitizedHtml";

/**
 * Post body. Plain-text posts (as typed in the admin) are split into
 * paragraphs on blank lines, with single line breaks kept; HTML posts are
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
              {line}
              {j < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
