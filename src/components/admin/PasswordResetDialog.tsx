"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, RefreshCw, Eye, EyeOff, AlertCircle } from "lucide-react";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  onSuccess?: () => void;
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onSuccess,
}: PasswordResetDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateRandom: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate password');
      }

      setGeneratedPassword(data.newPassword);
      setNewPassword(data.newPassword);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to generate password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetCustomPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, generateRandom: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setGeneratedPassword(null);
    setError(null);
    setSuccess(false);
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset the password for <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-300 rounded-md p-3">
              <p className="text-sm text-green-800 font-medium">
                ✓ Password reset successfully!
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Generate Random Password */}
          <div className="space-y-2">
            <Label>Option 1: Generate Random Password</Label>
            <Button
              onClick={handleGeneratePassword}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Secure Password
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Custom Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Option 2: Set Custom Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleSetCustomPassword}
                disabled={loading || !newPassword}
              >
                Set
              </Button>
            </div>
          </div>

          {/* Generated Password Display */}
          {generatedPassword && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 space-y-3">
              <div>
                <Label className="text-yellow-900">New Password Generated:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white border border-yellow-400 rounded px-3 py-2 font-mono text-sm font-bold text-yellow-900">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-800">
                ⚠️ Save this password! It will not be shown again.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-300 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The user will need to use this new password
              to login. Make sure to share it with them securely.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
