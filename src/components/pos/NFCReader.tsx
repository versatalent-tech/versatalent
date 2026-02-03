"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, User, CheckCircle2, X } from "lucide-react";

interface NFCReaderProps {
  onCustomerLinked: (customer: {
    id: string;
    name: string;
    email: string;
    tier?: string;
    points?: number;
  }) => void;
  onCancel: () => void;
}

export function NFCReader({ onCustomerLinked, onCancel }: NFCReaderProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [cardUID, setCardUID] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcSupported, setNFCSupported] = useState(false);

  useEffect(() => {
    // Check if Web NFC API is supported
    if ('NDEFReader' in window) {
      setNFCSupported(true);
    }
  }, []);

  // Web NFC API reader (for supported browsers/devices)
  const readNFCCard = async () => {
    if (!('NDEFReader' in window)) {
      setError('NFC not supported on this device');
      return;
    }

    try {
      setReading(true);
      setError(null);

      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", async ({ serialNumber }: any) => {
        const uid = serialNumber.replace(/:/g, '');
        await handleCardRead(uid);
      });

      ndef.addEventListener("readingerror", () => {
        setError("Failed to read NFC card. Please try again.");
        setReading(false);
      });

    } catch (err: any) {
      console.error("NFC read error:", err);
      setError(err.message || "Failed to read NFC card");
      setReading(false);
    }
  };

  // Manual card UID entry
  const handleManualEntry = async () => {
    if (!cardUID.trim()) {
      setError("Please enter a card UID");
      return;
    }

    await handleCardRead(cardUID.trim());
  };

  // Process card UID
  const handleCardRead = async (uid: string) => {
    setReading(true);
    setError(null);

    try {
      const response = await fetch('/api/pos/nfc/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid: uid })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to read card');
      }

      // Success - link customer
      onCustomerLinked({
        id: data.customer.id,
        name: data.customer.name,
        email: data.customer.email,
        tier: data.vip?.tier,
        points: data.vip?.points_balance
      });

      setIsOpen(false);

    } catch (err: any) {
      console.error("Card read error:", err);
      setError(err.message || 'Failed to read card');
    } finally {
      setReading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gold" />
            Link Customer via NFC
          </DialogTitle>
          <DialogDescription>
            Tap the customer's NFC card or enter the card UID manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* NFC Reader (if supported) */}
          {nfcSupported && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Option 1: Tap NFC Card</label>
              <Button
                onClick={readNFCCard}
                disabled={reading}
                className="w-full bg-gold hover:bg-gold/90 text-white"
                size="lg"
              >
                {reading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Waiting for card...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Tap Card Now
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Hold the NFC card close to your device
              </p>
            </div>
          )}

          {/* Divider */}
          {nfcSupported && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {nfcSupported ? 'Option 2: ' : ''}Enter Card UID
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., ABCD1234"
                value={cardUID}
                onChange={(e) => setCardUID(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualEntry();
                  }
                }}
                disabled={reading}
              />
              <Button
                onClick={handleManualEntry}
                disabled={reading || !cardUID.trim()}
              >
                {reading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Link'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Find the UID printed on the back of the NFC card
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Note:</strong> Linking a customer allows automatic VIP points
              awarding when the order is paid.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={reading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple NFC reader button component
 */
export function NFCReaderButton({ onCustomerLinked }: {
  onCustomerLinked: (customer: any) => void;
}) {
  const [showReader, setShowReader] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        size="sm"
        onClick={() => setShowReader(true)}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Link Customer (NFC)
      </Button>

      {showReader && (
        <NFCReader
          onCustomerLinked={(customer) => {
            onCustomerLinked(customer);
            setShowReader(false);
          }}
          onCancel={() => setShowReader(false)}
        />
      )}
    </>
  );
}
