"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ShoppingCart, TrendingUp, Settings } from "lucide-react";
import { VIPMembershipsManager } from "@/components/admin/vip/VIPMembershipsManager";
import { VIPConsumptionTracker } from "@/components/admin/vip/VIPConsumptionTracker";

export default function AdminVIPPage() {
  const [activeTab, setActiveTab] = useState("memberships");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <MainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-white text-xl">Loading VIP Management...</div>
            </div>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
        <div className="container px-4 mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
              VIP <span className="text-gold">Management</span>
            </h1>
            <p className="text-gray-300">
              Manage VIP memberships, points, tiers, and consumption tracking
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="memberships" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">VIP Memberships</span>
              </TabsTrigger>
              <TabsTrigger value="consumption" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Consumption</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memberships">
              <VIPMembershipsManager />
            </TabsContent>

            <TabsContent value="consumption">
              <VIPConsumptionTracker />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </MainLayout>
  );
}
