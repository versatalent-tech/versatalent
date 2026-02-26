"use client";

import { Wifi, WifiOff, Loader2, AlertTriangle, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNFCReader } from "@/lib/hooks/useNFCReader";

interface NFCReaderStatusProps {
  onCardScanned?: (uid: string) => void;
  showControls?: boolean;
  compact?: boolean;
}

export function NFCReaderStatusIndicator({
  onCardScanned,
  showControls = true,
  compact = false,
}: NFCReaderStatusProps) {
  const {
    status,
    requestDevice,
    disconnect,
    startScanning,
    stopScanning,
    simulateScan,
    clearError,
  } = useNFCReader({
    onCardScanned,
    autoConnect: true,
  });

  const handleConnectClick = async () => {
    if (status.connected) {
      await disconnect();
    } else {
      await requestDevice();
    }
  };

  const handleScanClick = async () => {
    if (status.isScanning) {
      stopScanning();
    } else {
      await startScanning();
    }
  };

  // Compact mode - just show a status badge
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`
            ${status.connected
              ? 'border-green-500 text-green-700 bg-green-50'
              : 'border-gray-400 text-gray-600 bg-gray-50'
            }
          `}
        >
          {status.connected ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Reader Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Reader Not Detected
            </>
          )}
        </Badge>
        {status.isScanning && (
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Scanning...
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Nfc className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">NFC Reader</h3>
        </div>
        <Badge
          className={`
            ${status.connected
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-gray-100 text-gray-600 border-gray-300'
            }
          `}
        >
          {status.connected ? 'Connected' : 'Not Detected'}
        </Badge>
      </div>

      {/* Connection Status Details */}
      <div className="mb-4">
        {status.connected ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Wifi className="h-4 w-4" />
            <span>{status.deviceName || 'ACR122U NFC Reader'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <WifiOff className="h-4 w-4" />
            <span>No NFC reader detected</span>
          </div>
        )}

        {status.isScanning && (
          <div className="flex items-center gap-2 text-sm text-blue-600 mt-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Scanning for NFC cards...</span>
          </div>
        )}

        {status.lastScannedUID && (
          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
            <span className="text-xs text-gray-500">Last Scanned UID:</span>
            <code className="ml-2 text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
              {status.lastScannedUID}
            </code>
          </div>
        )}
      </div>

      {/* Error Message */}
      {status.error && (
        <div className="flex items-start gap-2 mb-4 p-2 bg-red-50 rounded border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{status.error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-red-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Browser Support Warning */}
      {!status.supportsWebHID && (
        <div className="flex items-start gap-2 mb-4 p-2 bg-amber-50 rounded border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-700">
            WebHID is not supported in this browser. Please use Chrome or Edge.
          </p>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnectClick}
            disabled={!status.supportsWebHID}
            className={status.connected ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
          >
            {status.connected ? (
              <>
                <WifiOff className="h-4 w-4 mr-1" />
                Disconnect
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-1" />
                Connect Reader
              </>
            )}
          </Button>

          {status.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanClick}
              className={status.isScanning ? 'border-blue-300 text-blue-600' : ''}
            >
              {status.isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Nfc className="h-4 w-4 mr-1" />
                  Start Scanning
                </>
              )}
            </Button>
          )}

          {/* Simulate scan button for testing */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => simulateScan()}
            className="text-gray-500"
            title="Simulate a card scan for testing"
          >
            Test Scan
          </Button>
        </div>
      )}
    </div>
  );
}
