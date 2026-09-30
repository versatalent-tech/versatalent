"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Netlify Forms only captures submissions POSTed to a static file when the
// site runs on the Next.js runtime (v5). public/__forms.html registers every
// form (name + fields) at deploy time, so submissions are sent there.
const NETLIFY_FORMS_ENDPOINT = "/__forms.html";

type NetlifyFormProps = {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  successPath?: string;
  children: React.ReactNode;
};

/**
 * A <form> that submits to Netlify Forms via fetch, then navigates to the
 * success page. Children must include the hidden `form-name` input and use
 * the same field names as the matching form in public/__forms.html.
 */
export function NetlifyForm({
  name,
  className,
  style,
  successPath = "/success",
  children,
}: NetlifyFormProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const body = new URLSearchParams(
        Array.from(formData.entries(), ([key, value]) => [key, String(value)])
      ).toString();

      const response = await fetch(NETLIFY_FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        throw new Error(`Form submission failed with status ${response.status}`);
      }

      router.push(successPath);
    } catch (err) {
      console.error(`[NetlifyForm:${name}]`, err);
      setError(
        "Sorry, your message couldn't be sent. Please try again, or email us at versatalent.management@gmail.com."
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      name={name}
      method="POST"
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className={className}
      style={style}
    >
      {children}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}
    </form>
  );
}
