"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2, AlertCircle, BadgeCheck, CreditCard } from "lucide-react";

type Status = "loading" | "error" | "redirecting" | "staff" | "guest";

/**
 * Where a phone tapping a VersaTalent card lands. The tap is logged (it
 * doesn't count as a check-in), then:
 *   artist card: the talent's public profile, in card mode
 *   VIP card: the member's pass
 *   staff card: a note pointing staff to their sign-in
 *   guest card: a short explanation
 */
export default function NFCRoutePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function handleNFCCard() {
      try {
        const cardUid = params.card_uid as string;

        const response = await fetch(`/api/nfc/${encodeURIComponent(cardUid)}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Invalid or inactive NFC card");
          return;
        }

        // Record the tap (not a check-in: only staff check people in at the door)
        await fetch("/api/nfc/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_uid: cardUid }),
        }).catch(() => undefined);

        if (data.type === "artist") {
          setStatus("redirecting");
          router.replace(`/talents/${data.talent_id}?from=card`);
        } else if (data.type === "vip") {
          setStatus("redirecting");
          router.replace(`/vip/${data.member_id}`);
        } else if (data.type === "staff") {
          setStatus("staff");
        } else {
          setStatus("guest");
        }
      } catch (error) {
        console.error("NFC routing error:", error);
        setStatus("error");
        setErrorMessage("Failed to process NFC card. Please try again.");
      }
    }

    if (params.card_uid) {
      handleNFCCard();
    }
  }, [params.card_uid, router]);

  return (
    <MainLayout>
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container px-4 mx-auto">
          <div className="max-w-md mx-auto text-center">
            {(status === "loading" || status === "redirecting") && (
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 text-gold animate-spin mx-auto" />
                <h2 className="text-2xl font-bold text-white">{status === "loading" ? "Reading card…" : "Opening…"}</h2>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold text-white">Invalid Card</h2>
                <p className="text-gray-300">{errorMessage}</p>
                <Link
                  href="/"
                  className="inline-block mt-4 px-6 py-3 bg-gold hover:bg-gold/90 text-white rounded-lg transition-colors"
                >
                  Go to Homepage
                </Link>
              </div>
            )}

            {status === "staff" && (
              <div className="space-y-4">
                <BadgeCheck className="h-16 w-16 text-gold mx-auto" />
                <h2 className="text-2xl font-bold text-white">VersaTalent staff card</h2>
                <p className="text-gray-300">
                  This card identifies a member of the VersaTalent team at the door and the bar. Staff can sign in to the till and event tools here.
                </p>
                <Link
                  href="/staff/login"
                  className="inline-block mt-4 px-6 py-3 bg-gold hover:bg-gold/90 text-black rounded-lg transition-colors"
                >
                  Staff sign-in
                </Link>
              </div>
            )}

            {status === "guest" && (
              <div className="space-y-4">
                <CreditCard className="h-16 w-16 text-gold mx-auto" />
                <h2 className="text-2xl font-bold text-white">VersaTalent guest card</h2>
                <p className="text-gray-300">Show this card to a member of staff at the door. Want your own card and rewards?</p>
                <Link
                  href="/membership"
                  className="inline-block mt-4 px-6 py-3 bg-gold hover:bg-gold/90 text-black rounded-lg transition-colors"
                >
                  Join VersaTalent VIP
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
