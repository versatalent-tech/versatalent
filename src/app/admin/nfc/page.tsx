"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, Calendar, CheckSquare, Activity, Nfc, HelpCircle } from "lucide-react";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InlineLoader } from "@/components/admin/DynamicLoader";

// Dynamically import NFC management components with ssr: false since they use browser-only APIs
const UsersManager = dynamic(
  () => import("@/components/admin/nfc/UsersManager").then(mod => ({ default: mod.UsersManager })),
  { loading: () => <InlineLoader />, ssr: false }
);

const NFCCardsManager = dynamic(
  () => import("@/components/admin/nfc/NFCCardsManager").then(mod => ({ default: mod.NFCCardsManager })),
  { loading: () => <InlineLoader />, ssr: false }
);

const NFCEventsManager = dynamic(
  () => import("@/components/admin/nfc/NFCEventsManager").then(mod => ({ default: mod.NFCEventsManager })),
  { loading: () => <InlineLoader />, ssr: false }
);

const CheckInsLog = dynamic(
  () => import("@/components/admin/nfc/CheckInsLog").then(mod => ({ default: mod.CheckInsLog })),
  { loading: () => <InlineLoader />, ssr: false }
);

const ScanLogsViewer = dynamic(
  () => import("@/components/admin/nfc/ScanLogsViewer").then(mod => ({ default: mod.ScanLogsViewer })),
  { loading: () => <InlineLoader />, ssr: false }
);

const NFCCardRegistration = dynamic(
  () => import("@/components/admin/nfc/NFCCardRegistration").then(mod => ({ default: mod.NFCCardRegistration })),
  { loading: () => <InlineLoader />, ssr: false }
);

export default function AdminNFCPage() {
  const [activeTab, setActiveTab] = useState("register");
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
              <div className="text-white text-xl">Loading NFC Management...</div>
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
                  NFC <span className="text-gold">Management</span>
                </h1>
                <p className="text-gray-300">
                  Manage NFC cards, users, events, and scan history
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/admin/nfc/setup">
                  <Button variant="outline" size="sm" className="border-gold/50 text-gold hover:bg-gold/10">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Bridge Setup
                  </Button>
                </Link>
                <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
              </div>
            </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="register" className="flex items-center gap-2">
                <Nfc className="h-4 w-4" />
                <span className="hidden sm:inline">Register</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="checkins" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Check-ins</span>
              </TabsTrigger>
              <TabsTrigger value="scan-logs" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="register">
              <NFCCardRegistration />
            </TabsContent>

            <TabsContent value="cards">
              <NFCCardsManager />
            </TabsContent>

            <TabsContent value="users">
              <UsersManager />
            </TabsContent>

            <TabsContent value="events">
              <NFCEventsManager />
            </TabsContent>

            <TabsContent value="checkins">
              <CheckInsLog />
            </TabsContent>

            <TabsContent value="scan-logs">
              <ScanLogsViewer />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
