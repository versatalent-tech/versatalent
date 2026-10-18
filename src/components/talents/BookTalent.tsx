"use client";

import { useState } from "react";
import Link from "next/link";
import { ContactRound, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NetlifyForm } from "@/components/forms/NetlifyForm";

export type EnquirySource = "website" | "card_tap";

interface BookableTalent {
  id: string;
  name: string;
  has_press_kit?: boolean;
}

/**
 * Booking enquiry about one talent. Goes to Netlify Forms (email alert)
 * and to the CRM enquiries inbox, credited to the talent and marked as a
 * card tap when the prospect arrived from one.
 */
function BookingEnquiryForm({ talent, source }: { talent: BookableTalent; source: EnquirySource }) {
  return (
    <NetlifyForm name="versatalent-booking" className="space-y-4">
      <input type="hidden" name="form-name" value="versatalent-booking" />
      <input type="hidden" name="talentId" value={talent.id} />
      <input type="hidden" name="talentName" value={talent.name} />
      <input type="hidden" name="source" value={source} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Your name</span>
          <Input id="booking-name" name="name" required autoComplete="name" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Company or organisation</span>
          <Input id="booking-company" name="company" autoComplete="organization" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Email</span>
          <Input id="booking-email" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Phone (optional)</span>
          <Input id="booking-phone" name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">When</span>
          <Input id="booking-date" name="eventDate" placeholder="e.g. Sat 14 March, or spring 2027" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Event and venue</span>
          <Input id="booking-event" name="eventDetails" placeholder="e.g. Launch party, Leeds" />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Tell us about it</span>
        <Textarea id="booking-message" name="message" rows={4} required placeholder={`What you'd like ${talent.name} to do, audience size, budget if you have one…`} />
      </label>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input id="booking-consent" type="checkbox" name="marketingConsent" value="yes" className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
        <span>Send me occasional news about VersaTalent talent and events. You can unsubscribe at any time.</span>
      </label>
      <p className="text-xs text-gray-500">
        We use your details to reply to this enquiry. See our{" "}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>
        .
      </p>

      <Button type="submit" className="w-full bg-gold text-black hover:bg-gold/90">
        Send enquiry
      </Button>
    </NetlifyForm>
  );
}

/**
 * What a prospect can do from a talent's page: ask about booking them, save
 * the agency's booking contact, and download the press kit when there is one.
 * layout "panel" sits in the page; "bar" is the sticky bar shown after a card tap.
 */
export function BookTalent({
  talent,
  source,
  layout = "panel",
}: {
  talent: BookableTalent;
  source: EnquirySource;
  layout?: "panel" | "bar";
}) {
  const [open, setOpen] = useState(false);
  const firstName = talent.name.split(" ")[0];

  const bar = layout === "bar";
  const outline = bar ? "border-white/40 bg-transparent text-white hover:bg-white hover:text-black" : "";
  const size = bar ? "sm" : "default";
  // In the bar: three equal buttons, icon above a short label, so they fit a phone
  const fit = bar ? "h-auto min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-xs" : "";
  const icon = bar ? "h-4 w-4 flex-shrink-0" : "mr-1.5 h-4 w-4 flex-shrink-0";

  const buttons = (
    <>
      <Button size={size} onClick={() => setOpen(true)} className={`bg-gold text-black hover:bg-gold/90 ${fit}`}>
        <Mail className={icon} />
        <span className="truncate">{bar ? `Book ${firstName}` : `Enquire about booking ${talent.name}`}</span>
      </Button>
      <Button asChild size={size} variant="outline" className={`${outline} ${fit}`}>
        <a href={`/api/talents/${talent.id}/vcard`}>
          <ContactRound className={icon} />
          <span className="truncate">Save contact</span>
        </a>
      </Button>
      {talent.has_press_kit && (
        <Button asChild size={size} variant="outline" className={`${outline} ${fit}`}>
          <a href={`/api/talents/${talent.id}/press-kit`}>
            <Download className={icon} />
            <span className="truncate">Press kit</span>
          </a>
        </Button>
      )}
    </>
  );

  return (
    <>
      {layout === "bar" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
          <div className="container mx-auto max-w-xl space-y-2">
            <p className="text-center text-xs text-gray-300">
              You&apos;ve connected with <span className="font-semibold text-gold">{talent.name}</span>, represented by VersaTalent
            </p>
            <div className="flex gap-2">{buttons}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Book {talent.name}</h2>
          <p className="text-gray-600">
            Tell us about your event and we&apos;ll come back to you about availability. All bookings go through the VersaTalent team.
          </p>
          <div className="flex flex-col gap-2">{buttons}</div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Book {talent.name}</DialogTitle>
            <DialogDescription>Send the VersaTalent team a few details and we&apos;ll get back to you within 48 hours.</DialogDescription>
          </DialogHeader>
          <BookingEnquiryForm talent={talent} source={source} />
        </DialogContent>
      </Dialog>
    </>
  );
}
