import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { getTalentById, talents } from "@/lib/data/talents";
import { TalentProfile } from "@/components/talents/TalentProfile";
import { HeroSection } from "@/components/talents/HeroSection";

// Types for the page props
type TalentPageProps = {
  params: {
    id: string;
  };
};

// Generate static paths for all talents
export function generateStaticParams() {
  return talents.map((talent) => ({
    id: talent.id,
  }));
}

export default function TalentPage({ params }: TalentPageProps) {
  const talent = getTalentById(params.id);

  if (!talent) {
    notFound();
  }

  return (
    <MainLayout>
      <HeroSection talent={talent} />
      <TalentProfile talent={talent} />
    </MainLayout>
  );
}
