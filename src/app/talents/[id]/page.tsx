"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import type { Talent } from "@/lib/data/talents";
import { TalentProfile } from "@/components/talents/TalentProfile";
import { HeroSection } from "@/components/talents/HeroSection";

export default function TalentPage() {
  const params = useParams();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTalent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/talents/${params.id}`);

        if (!response.ok) {
          setNotFound(true);
          return;
        }

        const data = await response.json();
        setTalent(data);
      } catch (error) {
        console.error('Error fetching talent:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchTalent();
    }
  }, [params.id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (notFound || !talent) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Talent Not Found</h1>
            <p className="text-gray-600 mb-6">The talent you're looking for doesn't exist.</p>
            <Link href="/talents" className="text-gold hover:underline">
              Back to Talents
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <HeroSection talent={talent} />
      <TalentProfile talent={talent} />
    </MainLayout>
  );
}
