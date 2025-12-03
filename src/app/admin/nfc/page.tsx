"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, Calendar, CheckSquare } from "lucide-react";
import { UsersManager } from "@/components/admin/nfc/UsersManager";
import { NFCCardsManager } from "@/components/admin/nfc/NFCCardsManager";
import { NFCEventsManager } from "@/components/admin/nfc/NFCEventsManager";
import { CheckInsLog } from "@/components/admin/nfc/CheckInsLog";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminNFCPage() {
  const [activeTab, setActiveTab] = useState("users");
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
              <div className="text-white text-xl">Loading NFC Management...</div>
            </div>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <AdminAuthGuard>
      <MainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-12 md:py-16">
          <div className="container px-4 mx-auto">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  NFC <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">
                  Manage users, NFC cards, events, and check-ins
                </p>
              </div>
              <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
            </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">NFC Cards</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="checkins" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Check-ins</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UsersManager />
            </TabsContent>

            <TabsContent value="cards">
              <NFCCardsManager />
            </TabsContent>

            <TabsContent value="events">
              <NFCEventsManager />
            </TabsContent>

            <TabsContent value="checkins">
              <CheckInsLog />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </MainLayout>
    </AdminAuthGuard>
  );
}
