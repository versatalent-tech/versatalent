"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  Server,
  Database,
  Shield,
  Zap,
  Users,
  CreditCard,
  Smartphone,
  BarChart3,
  Globe,
  Layers,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function ArchitecturePage() {
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .page {
            page-break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 1cm;
        }
      `}</style>

      {/* Action Bar - Hidden in Print */}
      <div className="no-print fixed top-0 left-0 right-0 bg-black text-white z-50 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/versatalent-new-logo.png" alt="VersaTalent" className="h-8" />
          <span className="font-semibold">System Architecture Document</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-black"
          >
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-white min-h-screen pt-16 print:pt-0">

        {/* Cover Page */}
        <section className="page min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-12 print:min-h-[90vh]">
          <div className="text-center max-w-4xl">
            <div className="mb-8">
              <img
                src="/images/versatalent-new-logo.png"
                alt="VersaTalent"
                className="h-20 mx-auto mb-6"
              />
            </div>
            <h1 className="text-5xl font-bold mb-4">
              VersaTalent Platform
            </h1>
            <h2 className="text-2xl text-gold font-semibold mb-8">
              System Architecture & Technical Overview
            </h2>
            <div className="border-t border-gray-700 pt-8 mt-8">
              <p className="text-gray-400 mb-2">Version 2.1 | October 2026</p>
              <p className="text-gray-400">Prepared for: Shareholders, Investors, Technical Partners</p>
            </div>
            <div className="mt-16 grid grid-cols-4 gap-6 text-center">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-gold">100+</p>
                <p className="text-sm text-gray-400">API Handlers (60 routes)</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-gold">21</p>
                <p className="text-sm text-gray-400">Database Tables</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-gold">35</p>
                <p className="text-sm text-gray-400">Pages</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-gold">3</p>
                <p className="text-sm text-gray-400">Payment Methods</p>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Summary */}
        <section className="page print-break p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-gold" />
            Executive Summary
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            VersaTalent runs on a <strong>custom full-stack web platform</strong> that combines the public agency website with the tools behind it: talent and event management, NFC membership cards, a VIP loyalty programme, and a point-of-sale system for events.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Modern Tech Stack</h4>
              </div>
              <p className="text-sm text-green-700">Next.js 15, TypeScript, PostgreSQL - Industry standard, easy to hire developers</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Serverless & Cost-Efficient</h4>
              </div>
              <p className="text-sm text-green-700">Zero server management, auto-scaling, pay only for actual usage</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">PCI-Compliant Payments</h4>
              </div>
              <p className="text-sm text-green-700">SumUp card readers and app handle all card data, no PCI certification required</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Production-Deployed</h4>
              </div>
              <p className="text-sm text-green-700">Live on Netlify with automatic SSL and CDN delivery</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Role-Based Access</h4>
              </div>
              <p className="text-sm text-green-700">Admin and staff areas guarded server-side; talent and VIP roles already in the data model</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Modular & Extensible</h4>
              </div>
              <p className="text-sm text-green-700">Repository layer per domain, JSONB for industry-specific talent data, swappable payment provider</p>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="page print-break p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Globe className="h-8 w-8 text-gold" />
            Platform Overview
          </h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">What VersaTalent Does</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Users className="h-6 w-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Talent Management</h4>
                  <p className="text-sm text-gray-600">Comprehensive profiles for models, musicians, athletes, chefs, and actors</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Payment Processing</h4>
                  <p className="text-sm text-gray-600">Full POS system with SumUp card readers, Tap to Pay and cash for events and retail</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Smartphone className="h-6 w-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">NFC Loyalty Program</h4>
                  <p className="text-sm text-gray-600">Card-based VIP membership with tiered rewards (Silver/Gold/Black)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold">Admin Dashboard</h4>
                  <p className="text-sm text-gray-600">Live figures for sales, events, VIP members and check-ins, plus a list of items needing action</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">User Types</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="p-3 text-left">User Type</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Access Level</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Admin</td>
                  <td className="p-3 text-gray-600">Agency management (single login configured on the server)</td>
                  <td className="p-3"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Full Access</span></td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 font-medium">Staff</td>
                  <td className="p-3 text-gray-600">Event and bar staff (individual logins)</td>
                  <td className="p-3"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">POS & Check-ins</span></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Talent</td>
                  <td className="p-3 text-gray-600">Models, musicians, athletes. Accounts linked to profiles; portal in planning</td>
                  <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Public Profile (portal planned)</span></td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 font-medium">VIP Customer</td>
                  <td className="p-3 text-gray-600">NFC card holders</td>
                  <td className="p-3"><span className="bg-gold/20 text-yellow-800 px-2 py-1 rounded text-sm">Membership Card Page</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Public Visitor</td>
                  <td className="p-3 text-gray-600">Website visitors</td>
                  <td className="p-3"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">Read Only</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* System Architecture */}
        <section className="page print-break p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Layers className="h-8 w-8 text-gold" />
            System Architecture
          </h2>

          <div className="bg-gray-900 text-white p-6 rounded-lg font-mono text-sm overflow-x-auto mb-8">
            <pre className="whitespace-pre">
{`┌─────────────────────────────────────────────────────────────────┐
│                            USERS                                 │
│  Admin  │  Staff (POS, event day)  │  VIP card pages  │  Public  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NETLIFY (CDN + Functions)                    │
│          SSL • Static assets • Git-based deploys                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS 15 APP                             │
│   React 18 • TypeScript • Tailwind CSS • shadcn/ui               │
│   Page guards: signed admin/staff session checked server-side    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API ROUTES (60 routes, 103 handlers)            │
│  /admin/* │ /staff/* │ /pos/* │ /vip/* │ /nfc/* │ /talents/* ... │
│  Each route checks its own role • parameterised SQL              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
     ┌──────────────┬───────────┴──┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   NEON   │  │  SUMUP   │  │ NETLIFY  │  │INSTAGRAM │  │ NETLIFY  │
│ Postgres │  │ Payments │  │  Blobs   │  │  oEmbed  │  │  Forms   │
│21 tables │  │+webhooks │  │ (images) │  │ (posts)  │  │(enquiry) │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘

  NFC readers at the till connect through a local bridge
  (nfc-bridge-server) that relays card taps to the POS page.`}
            </pre>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <Server className="h-6 w-6 text-gold mb-2" />
              <h4 className="font-semibold mb-1">Frontend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Next.js 15 (SSR/SSG)</li>
                <li>• React 18</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
                <li>• shadcn/ui</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <Database className="h-6 w-6 text-gold mb-2" />
              <h4 className="font-semibold mb-1">Backend</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Serverless API Routes</li>
                <li>• Neon PostgreSQL</li>
                <li>• SumUp Integration</li>
                <li>• bcryptjs Auth</li>
                <li>• Netlify Blobs (uploads)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <Shield className="h-6 w-6 text-gold mb-2" />
              <h4 className="font-semibold mb-1">Infrastructure</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Netlify Functions</li>
                <li>• Global CDN</li>
                <li>• Auto SSL</li>
                <li>• Git-based deploys</li>
                <li>• Auto-scaling</li>
              </ul>
            </div>
          </div>
        </section>

        {/* API & Database */}
        <section className="page print-break p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Database className="h-8 w-8 text-gold" />
            API & Database Overview
          </h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">API Domains (60 routes, 103 handlers)</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Authentication", endpoints: "/api/admin/auth/*, /api/staff/login|logout|auth", count: 6 },
                { name: "Staff Operations", endpoints: "/api/staff/event-day/*, /api/staff/pos/*", count: 4 },
                { name: "Talents", endpoints: "/api/talents/*", count: 2 },
                { name: "Events", endpoints: "/api/events/*", count: 3 },
                { name: "VIP Programme", endpoints: "/api/vip/*, /api/admin/tier-benefits/*", count: 10 },
                { name: "NFC & Members", endpoints: "/api/nfc/*, /api/users/*", count: 12 },
                { name: "POS & Payments", endpoints: "/api/pos/*, /api/admin/sumup/*, /api/webhooks/sumup", count: 13 },
                { name: "Content", endpoints: "/api/blogs/*, /api/newsletter/*, /api/instagram/*", count: 7 },
                { name: "Uploads & Dashboard", endpoints: "/api/upload, /api/uploads/*, /api/admin/dashboard", count: 3 },
              ].map((domain) => (
                <div key={domain.name} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{domain.name}</span>
                    <span className="bg-gold/20 text-yellow-800 px-2 py-0.5 rounded text-xs">{domain.count}</span>
                  </div>
                  <code className="text-xs text-gray-500">{domain.endpoints}</code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Database Schema (21 Tables)</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Core Entities</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>users</code> - Accounts &amp; roles (admin, staff, artist, vip)</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>talents</code> - Talent profiles & portfolios</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>events</code> - Event records</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>blog_posts</code> - Blog content</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>newsletter_subscribers</code> - Mailing list</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">VIP System</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>vip_memberships</code> - Tier & points</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>vip_points_log</code> - Transaction history</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>vip_point_rules</code> - Earning rules</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>vip_tier_benefits</code> - Tier perks</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>vip_consumptions</code>, <code>vip_profiles</code>, <code>vip_checkin_awards</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">NFC System</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>nfc_cards</code> - Physical cards</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>checkins</code> - Check-in records</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>nfc_scan_logs</code> - Card scan audit trail</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>nfc_events</code> - NFC-enabled events</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">POS System</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>products</code> - Product catalog</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>pos_orders</code> - Orders</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>pos_order_items</code> - Line items</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> <code>inventory_movements</code> - Stock changes</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Scalability */}
        <section className="page print-break p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Shield className="h-8 w-8 text-gold" />
            Security & Scalability
          </h2>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Security Measures</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Password Security</p>
                    <p className="text-sm text-gray-600">bcryptjs with salted hashes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Session Management</p>
                    <p className="text-sm text-gray-600">HMAC-signed, HTTP-only cookies (SameSite=Lax, Secure), 24-hour expiry</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Transport Security</p>
                    <p className="text-sm text-gray-600">HTTPS everywhere via Netlify-managed certificates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Injection Protection</p>
                    <p className="text-sm text-gray-600">Parameterised SQL throughout; blog HTML sanitised with DOMPurify</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">PCI Compliance</p>
                    <p className="text-sm text-gray-600">SumUp handles all card data</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Scalability Features</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Serverless Architecture</p>
                    <p className="text-sm text-gray-600">Auto-scales to demand, zero provisioning</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Global CDN</p>
                    <p className="text-sm text-gray-600">Pages and assets served from Netlify&apos;s CDN</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Database Auto-scaling</p>
                    <p className="text-sm text-gray-600">Neon PostgreSQL 17, compute scales 0.25–2 CU</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Caching Layer</p>
                    <p className="text-sm text-gray-600">CDN caching of public pages; short-lived in-memory cache per function</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Modular Design</p>
                    <p className="text-sm text-gray-600">Components replaceable independently</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">Known Gaps &amp; Roadmap</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li><strong>Login rate limiting:</strong> not yet in place on admin and staff sign-in.</li>
              <li><strong>Admin accounts:</strong> one shared admin login from server settings; moving to individual accounts with roles.</li>
              <li><strong>Audit trail:</strong> card scans are logged; admin changes are not yet.</li>
              <li><strong>Enquiries:</strong> contact, brand and talent forms go to Netlify Forms, outside the database.</li>
              <li><strong>Planned:</strong> CRM and booking pipeline, talent portal, role-based team access, KPI tracking.</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Modular Replacement Options</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Module</th>
                  <th className="text-left p-2">Current</th>
                  <th className="text-left p-2">Can Be Replaced With</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Database</td>
                  <td className="p-2 text-gray-600">Neon PostgreSQL</td>
                  <td className="p-2 text-gray-600">Supabase, AWS RDS, PlanetScale</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Payments</td>
                  <td className="p-2 text-gray-600">SumUp</td>
                  <td className="p-2 text-gray-600">Stripe, Square, Adyen, PayPal</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Hosting</td>
                  <td className="p-2 text-gray-600">Netlify</td>
                  <td className="p-2 text-gray-600">Vercel, AWS Amplify, Cloudflare</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Auth</td>
                  <td className="p-2 text-gray-600">Custom signed session cookies</td>
                  <td className="p-2 text-gray-600">Auth0, Clerk, NextAuth.js</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact Page */}
        <section className="page print-break min-h-[50vh] flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-12">
          <div className="text-center max-w-2xl">
            <img
              src="/images/versatalent-new-logo.png"
              alt="VersaTalent"
              className="h-16 mx-auto mb-8"
            />
            <h2 className="text-3xl font-bold mb-4">Ready to Partner?</h2>
            <p className="text-gray-400 mb-8">
              For technical discussions, code review access, or pilot deployment planning.
            </p>
            <div className="bg-white/10 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gold mb-4">Next Steps</h3>
              <ol className="text-left space-y-2 text-gray-300">
                <li>1. Review this architecture document</li>
                <li>2. Access the GitHub repository for code review</li>
                <li>3. Schedule a technical deep-dive session</li>
                <li>4. Identify integration points for your systems</li>
                <li>5. Plan a pilot deployment or POC</li>
              </ol>
            </div>
            <p className="text-sm text-gray-500">
              Document Version 2.1 | October 2026 | VersaTalent Engineering Team
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
