"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Mail, Lock, User } from "lucide-react";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: {
    name: string;
    email: string;
    password: string;
  };
}

export function CredentialsDialog({
  open,
  onOpenChange,
  credentials,
}: CredentialsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyAllCredentials = async () => {
    const text = `VersaTalent Login Credentials

Name: ${credentials.name}
Email: ${credentials.email}
Password: ${credentials.password}

Login at: ${window.location.origin}/dashboard

Please change your password after your first login.

---
VersaTalent Team`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField("all");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <Check className="h-5 w-5" />
            Talent Created Successfully!
          </DialogTitle>
          <DialogDescription>
            User account created for <strong>{credentials.name}</strong>. Copy these
            credentials and share them securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4" />
              Name
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 font-mono text-sm">
                {credentials.name}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.name, "name")}
                className="shrink-0"
              >
                {copiedField === "name" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 font-mono text-sm">
                {credentials.email}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.email, "email")}
                className="shrink-0"
              >
                {copiedField === "email" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2 font-mono text-sm font-bold text-yellow-900">
                {credentials.password}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(credentials.password, "password")}
                className="shrink-0"
              >
                {copiedField === "password" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-300 rounded-md p-3">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> This password will only be shown once.
              Copy it now and share it securely with the talent.
            </p>
          </div>

          {/* Dashboard Link */}
          <div className="bg-blue-50 border border-blue-300 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>🔗 Dashboard:</strong>{" "}
              <code className="bg-white px-2 py-1 rounded text-xs">
                {window.location.origin}/dashboard
              </code>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={copyAllCredentials}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {copiedField === "all" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Credentials
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
