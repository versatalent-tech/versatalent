"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemberReferralSummary } from "@/lib/referrals/types";

/** Invite friends: the member's code, share link and how many joined */
export function ReferralPassCard({ memberId }: { memberId: string }) {
  const [data, setData] = useState<MemberReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/referrals?member=${encodeURIComponent(memberId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => body.success && setData(body.data))
      .catch(() => undefined);
  }, [memberId]);

  if (!data?.open || !data.code || !data.link) return null;
  const link = data.link;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your link", link);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "Join VersaTalent VIP", text: `Join VersaTalent VIP with my code ${data.code}`, url: link });
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <UserPlus className="h-6 w-6 text-gold" /> Invite friends
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        When a friend joins with your code and comes to their first event, you get {data.referrer_points.toLocaleString("en-GB")} reward
        points.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg border-2 border-dashed border-gold px-4 py-2 font-mono text-2xl font-bold tracking-widest">{data.code}</p>
        <Button variant="outline" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button variant="outline" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        )}
      </div>
      {data.joined > 0 && (
        <p className="mt-4 text-sm text-gray-600">
          {data.joined} friend{data.joined === 1 ? "" : "s"} joined · {data.approved} came to an event ·{" "}
          {data.points_earned.toLocaleString("en-GB")} points earned
        </p>
      )}
    </div>
  );
}
