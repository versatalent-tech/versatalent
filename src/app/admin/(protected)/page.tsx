"use client";

import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Calendar,
  Instagram,
  Users,
  Settings,
  BarChart3,
  Image as ImageIcon,
  FileText,
  CreditCard,
  Trophy,
  ShoppingCart,
  PenLine,
  Mail,
} from "lucide-react";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminPage() {
  const adminFeatures = [
    {
      title: "Talent Management",
      description: "Add, edit, and manage talents in your roster",
      icon: Users,
      href: "/admin/talents",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Event Management",
      description: "Create, edit, and delete events for your talent roster",
      icon: Calendar,
      href: "/admin/events",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Instagram Feed",
      description: "Manage and configure Instagram integration",
      icon: Instagram,
      href: "/admin/instagram",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      title: "NFC Management",
      description: "Manage users, NFC cards, events, and check-ins",
      icon: CreditCard,
      href: "/admin/nfc",
      color: "text-gold",
      bgColor: "bg-amber-50",
    },
    {
      title: "VIP Management",
      description: "Manage VIP points, tiers, and consumption tracking",
      icon: Trophy,
      href: "/admin/vip",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "POS System",
      description: "Point of Sale for staff - products, orders, and payments",
      icon: ShoppingCart,
      href: "/admin/pos/products",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Blog Management",
      description: "Create and manage blog posts with images and videos",
      icon: PenLine,
      href: "/admin/blogs",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Newsletter Subscribers",
      description: "View and manage newsletter subscriptions",
      icon: Mail,
      href: "/admin/newsletter",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Analytics Dashboard",
      description: "Track website performance and visitor metrics",
      icon: BarChart3,
      href: "/dashboard",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-black via-gray-900 to-black py-16 md:py-24">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Admin <span className="text-gold">Dashboard</span>
                </h1>
                <p className="text-xl text-gray-300 max-w-2xl">
                  Manage your talent agency with powerful tools and insights
                </p>
              </div>
              <LogoutButton variant="outline" className="border-white text-white hover:bg-white hover:text-black" />
            </div>
          </div>
        </section>

      {/* Admin Features Grid */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        Open {feature.title}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Quick <span className="text-gold">Overview</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Talents</CardDescription>
                <CardTitle className="text-3xl">4</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active Events</CardDescription>
                <CardTitle className="text-3xl">6</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>NFC Check-ins</CardDescription>
                <CardTitle className="text-3xl text-gold">0</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Blog Posts</CardDescription>
                <CardTitle className="text-3xl">12</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Instagram Posts</CardDescription>
                <CardTitle className="text-3xl">48</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Documentation & <span className="text-gold">Guides</span>
            </h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gold" />
                    Event Management Guide
                  </CardTitle>
                  <CardDescription>
                    Learn how to create, edit, and manage events for your talent roster
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Comprehensive guide covering event creation, image uploads, pricing, and best practices.
                  </p>
                  <div className="text-sm text-gray-500">
                    Location: <code className="bg-gray-100 px-2 py-1 rounded">.same/event-management-guide.md</code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gold" />
                    Form Configuration
                  </CardTitle>
                  <CardDescription>
                    Details about Netlify Forms setup and email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    All forms are configured and working. Email notifications need manual setup in Netlify Dashboard.
                  </p>
                  <div className="text-sm text-gray-500">
                    Location: <code className="bg-gray-100 px-2 py-1 rounded">.same/FORMS-SUCCESS.md</code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gold" />
                    NFC Membership System
                  </CardTitle>
                  <CardDescription>
                    Complete guide to the NFC membership and check-in system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Learn how to manage NFC cards, users, events, and track check-ins. Includes setup, deployment, and troubleshooting.
                  </p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Quick Start: <code className="bg-gray-100 px-2 py-1 rounded">QUICK_START_NFC.md</code></div>
                    <div>Full Guide: <code className="bg-gray-100 px-2 py-1 rounded">NFC_SYSTEM_README.md</code></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
