"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HONEYPOT_FIELD } from "@/lib/crm/types";

// Netlify Forms only captures submissions POSTed to a static file when the
// site runs on the Next.js runtime (v5). public/__forms.html registers every
// form (name + fields) at deploy time, so submissions are sent there.
const NETLIFY_FORMS_ENDPOINT = "/__forms.html";

// A copy also goes to the admin CRM's enquiries inbox
const CRM_ENQUIRIES_ENDPOINT = "/api/enquiries";

type NetlifyFormProps = {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  successPath?: string;
  children: React.ReactNode;
};

/**
 * A <form> that submits to Netlify Forms (for email alerts) and to the CRM
 * enquiries inbox, then navigates to the success page. It counts as sent when
 * either one accepts it. Children must include the hidden `form-name` input and use
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
      const entries = Array.from(formData.entries(), ([key, value]) => [key, String(value)] as [string, string]);

      const [netlify, crm] = await Promise.allSettled([
        fetch(NETLIFY_FORMS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(entries).toString(),
        }),
        fetch(CRM_ENQUIRIES_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formName: name, fields: Object.fromEntries(entries) }),
        }),
      ]);

      const accepted = [netlify, crm].some((result) => result.status === "fulfilled" && result.value.ok);
      if (!accepted) {
        throw new Error("Form submission failed (Netlify Forms and CRM)");
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
      {/* Spam trap: hidden from people, bots fill it in */}
      <p hidden aria-hidden="true">
        <label>
          Leave this empty: <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      {children}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}
    </form>
  );
}
