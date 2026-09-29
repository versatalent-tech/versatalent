import DOMPurify from 'dompurify';

/**
 * Sanitize admin-authored HTML (blog content, talent bios) before rendering
 * it with dangerouslySetInnerHTML. Strips scripts, event handlers and
 * javascript: URLs.
 *
 * DOMPurify needs a DOM, so this only works in the browser. Both callers
 * render this content after a client-side fetch; on the server we return an
 * empty string rather than unsanitized HTML.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof window === 'undefined') {
    return '';
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
