"use client";

import { useState, useEffect } from "react";
import { SimpleMainLayout } from "@/components/layout/SimpleMainLayout";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Apple,
  Monitor,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  ArrowLeft,
  ExternalLink,
  Shield,
  Cpu,
  HelpCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import Link from "next/link";

function detectPlatform(): { os: string; arch: string; recommended: string } {
  if (typeof window === "undefined") {
    return { os: "unknown", arch: "unknown", recommended: "linux-x64" };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || "";

  let os = "unknown";
  let arch = "x64";

  if (userAgent.includes("win")) {
    os = "windows";
  } else if (userAgent.includes("mac")) {
    os = "macos";
    if (userAgent.includes("arm") || platform.includes("arm")) {
      arch = "arm64";
    }
  } else if (userAgent.includes("linux")) {
    os = "linux";
  }

  const recommended = `${os}-${arch}`;
  return { os, arch, recommended };
}

const DOWNLOAD_BASE_URL = "https://github.com/versatalent-tech/nfc-bridge-server/releases/latest/download";

const DOWNLOADS = [
  { id: "windows-x64", name: "Windows", arch: "x64 (Intel/AMD)", icon: Monitor, filename: "nfc-bridge-win-x64.exe", size: "~45 MB" },
  { id: "macos-x64", name: "macOS", arch: "Intel", icon: Apple, filename: "nfc-bridge-macos-x64", size: "~45 MB" },
  { id: "macos-arm64", name: "macOS", arch: "Apple Silicon (M1/M2/M3)", icon: Apple, filename: "nfc-bridge-macos-arm64", size: "~45 MB" },
  { id: "linux-x64", name: "Linux", arch: "x64 (Intel/AMD)", icon: Terminal, filename: "nfc-bridge-linux-x64", size: "~46 MB" },
  { id: "linux-arm64", name: "Linux", arch: "ARM64", icon: Terminal, filename: "nfc-bridge-linux-arm64", size: "~46 MB" },
];

export default function NFCBridgeSetupPage() {
  const [platform, setPlatform] = useState<{ os: string; arch: string; recommended: string }>({ os: "unknown", arch: "unknown", recommended: "linux-x64" });
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [bridgeInfo, setBridgeInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
  }, []);

  const checkBridgeConnection = async () => {
    setConnectionStatus("checking");
    setBridgeInfo(null);

    const endpoints = ["https://localhost:9876/health", "http://localhost:9876/health"];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(endpoint, { signal: controller.signal, mode: "cors" });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setBridgeInfo(data);
          setConnectionStatus("connected");
          return;
        }
      } catch {
        // Continue to next endpoint
      }
    }
    setConnectionStatus("error");
  };

  if (!mounted) {
    return (
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black min-h-screen py-12">
          <div className="container px-4 mx-auto flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-gold animate-spin" />
          </div>
        </section>
      </SimpleMainLayout>
    );
  }

  return (
    <AdminAuthGuard>
      <SimpleMainLayout>
        <section className="bg-gradient-to-br from-black via-gray-900 to-black min-h-screen py-12 md:py-16">
          <div className="container px-4 mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <Link href="/admin/nfc">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to NFC Management
                </Button>
              </Link>
              <LogoutButton />
            </div>

            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 mb-4">
                <Server className="h-8 w-8 text-gold" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">NFC Bridge Server Setup</h1>
              <p className="text-gray-400 max-w-2xl mx-auto">
                The NFC Bridge Server allows you to connect physical ACR122U NFC readers to this web application.
              </p>
            </div>

            {/* Connection Status */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-gold" />
                  Connection Status
                </h2>
                <Button variant="outline" size="sm" onClick={checkBridgeConnection} disabled={connectionStatus === "checking"} className="border-gold/50 text-gold hover:bg-gold/10">
                  {connectionStatus === "checking" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-900/50">
                {connectionStatus === "idle" && <><WifiOff className="h-8 w-8 text-gray-500" /><div><p className="text-gray-300 font-medium">Not tested yet</p><p className="text-gray-500 text-sm">Click Test Connection to check if bridge is running</p></div></>}
                {connectionStatus === "checking" && <><Loader2 className="h-8 w-8 text-gold animate-spin" /><div><p className="text-gray-300 font-medium">Checking connection...</p></div></>}
                {connectionStatus === "connected" && <><CheckCircle2 className="h-8 w-8 text-green-500" /><div className="flex-1"><p className="text-green-400 font-medium">Bridge Connected!</p><p className="text-gray-400 text-sm">{bridgeInfo?.reader?.connected ? `NFC Reader: ${bridgeInfo.reader.name}` : "No NFC reader detected"}</p></div>{bridgeInfo && <Badge variant="outline" className="border-green-500/50 text-green-400">v{bridgeInfo.version || "1.0.0"}</Badge>}</>}
                {connectionStatus === "error" && <><XCircle className="h-8 w-8 text-red-500" /><div><p className="text-red-400 font-medium">Bridge Not Found</p><p className="text-gray-500 text-sm">Make sure the NFC Bridge Server is running</p></div></>}
              </div>
            </div>

            {/* Downloads */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <Download className="h-5 w-5 text-gold" />
                Download NFC Bridge Server
              </h2>
              <p className="text-gray-400 text-sm mb-6">Select the version for your operating system.</p>

              {platform.os !== "unknown" && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-gold">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm font-medium">Detected: {platform.os.charAt(0).toUpperCase() + platform.os.slice(1)} ({platform.arch})</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DOWNLOADS.map((download) => {
                  const Icon = download.icon;
                  const isRecommended = download.id === platform.recommended;
                  return (
                    <div key={download.id} className={`relative p-4 rounded-lg border transition-all ${isRecommended ? "bg-gold/10 border-gold/50" : "bg-gray-900/50 border-gray-700 hover:border-gray-600"}`}>
                      {isRecommended && <Badge className="absolute -top-2 -right-2 bg-gold text-black text-xs">Recommended</Badge>}
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className={`h-6 w-6 ${isRecommended ? "text-gold" : "text-gray-400"}`} />
                        <div><h3 className="text-white font-medium">{download.name}</h3><p className="text-gray-500 text-xs">{download.arch}</p></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">{download.size}</span>
                        <a href={`${DOWNLOAD_BASE_URL}/${download.filename}`} className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold/80" target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" />Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gold" />
                Installation Instructions
              </h2>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2"><Monitor className="h-5 w-5 text-blue-400" />Windows</h3>
                <ol className="space-y-2 text-gray-300 text-sm ml-7 list-decimal">
                  <li>Download <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">nfc-bridge-win-x64.exe</code></li>
                  <li>Double-click to run (Windows may show a security warning)</li>
                  <li>Connect your ACR122U NFC reader via USB</li>
                </ol>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2"><Apple className="h-5 w-5 text-gray-300" />macOS</h3>
                <ol className="space-y-2 text-gray-300 text-sm ml-7 list-decimal">
                  <li>Download the appropriate version for your Mac</li>
                  <li>Open Terminal and run: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">chmod +x nfc-bridge-macos-*</code></li>
                  <li>Run it: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">./nfc-bridge-macos-arm64</code></li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2"><Terminal className="h-5 w-5 text-orange-400" />Linux</h3>
                <ol className="space-y-2 text-gray-300 text-sm ml-7 list-decimal">
                  <li>Install PC/SC: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">sudo apt install pcscd</code></li>
                  <li>Make executable: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">chmod +x nfc-bridge-linux-*</code></li>
                  <li>Run: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-gold">./nfc-bridge-linux-x64</code></li>
                </ol>
              </div>
            </div>

            {/* SSL Setup */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gold" />
                SSL Setup (Optional)
              </h2>
              <p className="text-gray-400 text-sm mb-4">For secure connections from HTTPS websites:</p>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <code className="block text-gold text-sm">./scripts/generate-certs.sh  # macOS/Linux</code>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/admin/nfc">
                <Button className="bg-gold hover:bg-gold/90 text-black">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to NFC Management
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </SimpleMainLayout>
    </AdminAuthGuard>
  );
}
