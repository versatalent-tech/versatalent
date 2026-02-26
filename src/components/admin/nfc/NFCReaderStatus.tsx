"use client";

import { Wifi, WifiOff, Loader2, AlertTriangle, Nfc, Zap, Info, Server, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNFCReader } from "@/lib/hooks/useNFCReader";
import Link from "next/link";

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
    enableSimulationMode,
    connectToBridge,
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
              ? status.connectionMethod === 'simulation'
                ? 'border-amber-500 text-amber-700 bg-amber-50'
                : 'border-green-500 text-green-700 bg-green-50'
              : 'border-gray-400 text-gray-600 bg-gray-50'
            }
          `}
        >
          {status.connected ? (
            <>
              {status.connectionMethod === 'simulation' ? (
                <Zap className="h-3 w-3 mr-1" />
              ) : (
                <Wifi className="h-3 w-3 mr-1" />
              )}
              {status.deviceName || 'Connected'}
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Not Connected
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
              ? status.connectionMethod === 'simulation'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : status.connectionMethod === 'bridge'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-green-100 text-green-800 border-green-300'
              : 'bg-gray-100 text-gray-600 border-gray-300'
            }
          `}
        >
          {status.connected
            ? status.connectionMethod === 'simulation'
              ? 'Simulation Mode'
              : status.connectionMethod === 'bridge'
                ? 'Bridge Connected'
                : 'Connected'
            : 'Not Connected'
          }
        </Badge>
      </div>

      {/* Connection Status Details */}
      <div className="mb-4">
        {status.connected ? (
          <div className="flex items-center gap-2 text-sm">
            {status.connectionMethod === 'simulation' ? (
              <>
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700">{status.deviceName || 'Simulation Mode'}</span>
              </>
            ) : status.connectionMethod === 'bridge' ? (
              <>
                <Server className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700">{status.deviceName || 'NFC Bridge Server'}</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{status.deviceName || 'ACR122U NFC Reader'}</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <WifiOff className="h-4 w-4" />
            <span>No NFC reader connected</span>
          </div>
        )}

        {status.isScanning && (
          <div className="flex items-center gap-2 text-sm text-blue-600 mt-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting for NFC card...</span>
          </div>
        )}

        {status.lastScannedUID && (
          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
            <span className="text-xs text-gray-500">Last Scanned UID:</span>
            <code className="ml-2 text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
              {status.lastScannedUID}
            </code>
            {status.cardPresent && (
              <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                Card Present
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {status.error && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 rounded border border-amber-200">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 whitespace-pre-line">{status.error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-amber-600 underline mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Info about simulation mode when not connected */}
      {!status.connected && !status.error && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 flex-1">
            <p className="font-medium mb-1">Quick Start Options:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Simulation Mode</strong> - Test NFC features without hardware</li>
              <li><strong>NFC Bridge</strong> - Connect physical readers via local server</li>
            </ul>
            <Link
              href="/admin/nfc/setup"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 mt-2 font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Need a physical NFC reader? View setup guide
            </Link>
          </div>
        </div>
      )}

      {/* Bridge Server Status */}
      {status.bridgeAvailable && !status.connected && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-green-50 rounded border border-green-200">
          <Server className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-800 font-medium">NFC Bridge Server Detected</p>
            <p className="text-xs text-green-700 mt-1">
              A local NFC bridge server is available. Click "Connect Bridge" to use your physical NFC reader.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="flex gap-2 flex-wrap">
          {/* Primary action: Simulation mode for easy testing */}
          {!status.connected && (
            <Button
              size="sm"
              onClick={enableSimulationMode}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Zap className="h-4 w-4 mr-1" />
              Enable Simulation
            </Button>
          )}

          {/* Bridge connection if available */}
          {status.bridgeAvailable && !status.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectToBridge()}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Server className="h-4 w-4 mr-1" />
              Connect Bridge
            </Button>
          )}

          {/* Disconnect when connected */}
          {status.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectClick}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <WifiOff className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          )}

          {/* Scanning controls when connected */}
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

          {/* Test scan button - always available */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => simulateScan()}
            className="text-gray-600 hover:text-gray-900"
            title="Generate a simulated NFC card scan for testing"
          >
            <Zap className="h-4 w-4 mr-1" />
            Test Scan
          </Button>
        </div>
      )}

      {/* Help text for simulation mode */}
      {status.connectionMethod === 'simulation' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Simulation Mode:</strong> Click "Test Scan" to generate simulated NFC card UIDs.
            This allows you to test the full registration workflow without physical hardware.
          </p>
        </div>
      )}
    </div>
  );
}
