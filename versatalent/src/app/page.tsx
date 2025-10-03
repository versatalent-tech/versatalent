import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedTalents } from "@/components/home/FeaturedTalents";
import { IndustriesSection } from "@/components/home/IndustriesSection";
import { AboutSection } from "@/components/home/AboutSection";
import { CTASection } from "@/components/home/CTASection";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeaturedEvents } from "@/components/home/FeaturedEvents";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VersaTalent | Home",
  description: "Premier talent agency representing exceptional talent across various industries",
};

export default function Home() {
  return (
    <MainLayout>
      <HeroSection />
      <FeaturedTalents />
      <FeaturedEvents />
      <IndustriesSection />
      <AboutSection />
      <CTASection />
    </MainLayout>
  );
}
