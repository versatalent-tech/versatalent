"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ShoppingCart, TrendingUp, Settings, Award } from "lucide-react";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DynamicLoader, InlineLoader } from "@/components/admin/DynamicLoader";
// Dynamically import heavy components to reduce initial bundle size
const VIPMembershipsManager = dynamic(
  () => import("@/components/admin/vip/VIPMembershipsManager").then(mod => ({ default: mod.VIPMembershipsManager })),
  { loading: () => <InlineLoader /> }
);
const VIPConsumptionTracker = dynamic(
  () => import("@/components/admin/vip/VIPConsumptionTracker").then(mod => ({ default: mod.VIPConsumptionTracker })),
  { loading: () => <InlineLoader /> }
);
const TierBenefitsManager = dynamic(
  () => import("@/components/admin/vip/TierBenefitsManager").then(mod => ({ default: mod.TierBenefitsManager })),
  { loading: () => <InlineLoader /> }
);
const PointRulesManager = dynamic(
  () => import("@/components/admin/vip/PointRulesManager").then(mod => ({ default: mod.PointRulesManager })),
  { loading: () => <InlineLoader /> }
);
export default function AdminVIPPage() {
  const [activeTab, setActiveTab] = useState("memberships");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-white text-xl">Loading VIP Management...</div>
            </div>
          </div>
        </section>
      </SimpleMainLayout>
    );
  }
  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  VIP <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">
                  Manage VIP memberships, points, tiers, and consumption tracking
                </p>
              </div>
              <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
            </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="memberships" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Memberships</span>
              </TabsTrigger>
              <TabsTrigger value="consumption" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Consumption</span>
              </TabsTrigger>
              <TabsTrigger value="benefits" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Tier Benefits</span>
              </TabsTrigger>
              <TabsTrigger value="point-rules" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Point Rules</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="memberships">
              <VIPMembershipsManager />
            </TabsContent>
            <TabsContent value="consumption">
              <VIPConsumptionTracker />
            </TabsContent>
            <TabsContent value="benefits">
              <TierBenefitsManager />
            </TabsContent>
            <TabsContent value="point-rules">
              <div className="bg-white rounded-lg p-6">
                <PointRulesManager />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SimpleMainLayout>
    </AdminAuthGuard>
  );
}