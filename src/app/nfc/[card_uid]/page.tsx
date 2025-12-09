"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2, AlertCircle } from "lucide-react";

export default function NFCRoutePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function handleNFCCard() {
      try {
        const cardUid = params.card_uid as string;

        // Fetch NFC card data
        const response = await fetch(`/api/nfc/${cardUid}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data.error || 'Invalid or inactive NFC card');
          return;
        }

        // Log the check-in
        await fetch('/api/nfc/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            nfc_card_id: data.id,
            source: data.type === 'artist' ? 'artist_profile' : 'vip_pass',
            metadata: {
              card_uid: cardUid,
              redirect_type: data.type
            }
          })
        });

        // Redirect based on card type
        if (data.type === 'artist') {
          // Redirect to artist profile
          if (data.user.talent_id) {
            router.push(`/artist/${data.user.talent_id}`);
          } else {
            router.push(`/artist/${data.user.id}`);
          }
        } else if (data.type === 'vip') {
          router.push(`/vip/${data.user.id}`);
        } else if (data.type === 'staff') {
          router.push(`/admin?staff=${data.user.id}`);
        }

        setStatus('success');
      } catch (error) {
        console.error('NFC routing error:', error);
        setStatus('error');
        setErrorMessage('Failed to process NFC card. Please try again.');
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
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 text-gold animate-spin mx-auto" />
                <h2 className="text-2xl font-bold text-white">Processing NFC Card...</h2>
                <p className="text-gray-300">Please wait while we redirect you</p>
              </div>
            )}

            {status === 'error' && (
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

            {status === 'success' && (
              <div className="space-y-4">
                <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Card Verified!</h2>
                <p className="text-gray-300">Redirecting you now...</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
