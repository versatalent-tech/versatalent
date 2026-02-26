"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ACR122U USB identifiers
const ACR122U_VENDOR_ID = 0x072F; // ACS (Advanced Card Systems)

// ACR122U product IDs for different variants
const ACR122U_PRODUCT_IDS = [0x2200, 0x2214, 0x2210, 0x90CC];

// Local bridge server URL (for native NFC reader access)
const DEFAULT_BRIDGE_URL = "ws://localhost:9876";

export interface NFCReaderStatus {
  connected: boolean;
  deviceName: string | null;
  isScanning: boolean;
  lastScannedUID: string | null;
  error: string | null;
  supportsWebUSB: boolean;
  supportsWebHID: boolean;
  cardPresent: boolean;
  connectionMethod: 'webusb' | 'webhid' | 'bridge' | 'simulation' | null;
  bridgeAvailable: boolean;
}

export interface UseNFCReaderOptions {
  onCardScanned?: (uid: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
  bridgeUrl?: string;
}

export function useNFCReader(options: UseNFCReaderOptions = {}) {
  const {
    onCardScanned,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = false,
    bridgeUrl = DEFAULT_BRIDGE_URL
  } = options;

  const [status, setStatus] = useState<NFCReaderStatus>({
    connected: false,
    deviceName: null,
    isScanning: false,
    lastScannedUID: null,
    error: null,
    supportsWebUSB: false,
    supportsWebHID: false,
    cardPresent: false,
    connectionMethod: null,
    bridgeAvailable: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const supportsWebUSB = typeof navigator !== 'undefined' && 'usb' in navigator;
    const supportsWebHID = typeof navigator !== 'undefined' && 'hid' in navigator;

    setStatus(prev => ({ ...prev, supportsWebUSB, supportsWebHID }));

    // Check if bridge server is available
    checkBridgeAvailability();
  }, []);

  // Check if local NFC bridge server is running
  const checkBridgeAvailability = useCallback(async () => {
    try {
      // Try HTTP health check first (faster than WebSocket)
      const httpUrl = bridgeUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(`${httpUrl}/health`, {
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          setStatus(prev => ({ ...prev, bridgeAvailable: true }));
          console.log('NFC Bridge server is available');
          return true;
        }
      } catch {
        clearTimeout(timeoutId);
      }

      // Fallback: try WebSocket connection
      return new Promise<boolean>((resolve) => {
        const ws = new WebSocket(bridgeUrl);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          setStatus(prev => ({ ...prev, bridgeAvailable: true }));
          console.log('NFC Bridge server is available (WebSocket)');
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }, [bridgeUrl]);

  // Connect to NFC bridge server
  const connectToBridge = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve(true);
          return;
        }

        const ws = new WebSocket(bridgeUrl);

        ws.onopen = () => {
          console.log('Connected to NFC Bridge server');
          wsRef.current = ws;
          setStatus(prev => ({
            ...prev,
            connected: true,
            deviceName: 'NFC Bridge Server',
            connectionMethod: 'bridge',
            error: null,
            bridgeAvailable: true,
          }));
          onConnect?.();

          // Request device info
          ws.send(JSON.stringify({ type: 'getDeviceInfo' }));
          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'deviceInfo':
                setStatus(prev => ({
                  ...prev,
                  deviceName: data.deviceName || 'ACR122U NFC Reader',
                }));
                break;

              case 'cardScanned':
                if (data.uid) {
                  setStatus(prev => ({
                    ...prev,
                    lastScannedUID: data.uid,
                    cardPresent: true,
                  }));
                  onCardScanned?.(data.uid);
                  console.log('Card scanned via bridge:', data.uid);
                }
                break;

              case 'cardRemoved':
                setStatus(prev => ({ ...prev, cardPresent: false }));
                break;

              case 'error':
                setStatus(prev => ({ ...prev, error: data.message }));
                onError?.(data.message);
                break;

              case 'scanningStarted':
                setStatus(prev => ({ ...prev, isScanning: true }));
                break;

              case 'scanningStopped':
                setStatus(prev => ({ ...prev, isScanning: false }));
                break;
            }
          } catch (err) {
            console.error('Error parsing bridge message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('Bridge WebSocket error:', error);
          setStatus(prev => ({
            ...prev,
            error: 'Failed to connect to NFC Bridge. Make sure the bridge server is running.',
            bridgeAvailable: false,
          }));
          resolve(false);
        };

        ws.onclose = () => {
          console.log('Bridge WebSocket closed');
          wsRef.current = null;
          setStatus(prev => ({
            ...prev,
            connected: prev.connectionMethod === 'bridge' ? false : prev.connected,
            isScanning: prev.connectionMethod === 'bridge' ? false : prev.isScanning,
          }));

          if (status.connectionMethod === 'bridge') {
            onDisconnect?.();
          }
        };

      } catch (err) {
        console.error('Bridge connection error:', err);
        resolve(false);
      }
    });
  }, [bridgeUrl, onConnect, onDisconnect, onCardScanned, onError, status.connectionMethod]);

  // Main connect function - now prioritizes bridge connection
  const requestDevice = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, error: null }));

    // First, try to connect via bridge (most reliable for CCID devices)
    console.log('Checking for NFC Bridge server...');
    const bridgeAvailable = await checkBridgeAvailability();

    if (bridgeAvailable) {
      console.log('Connecting via NFC Bridge...');
      const connected = await connectToBridge();
      if (connected) return true;
    }

    // Inform user about the WebUSB/WebHID limitation
    setStatus(prev => ({
      ...prev,
      error: `The ACR122U NFC reader uses a protected USB interface (CCID/Smart Card) that browsers block for security reasons.

To use physical NFC cards:
1. Use the "Test Scan" button for simulation/testing
2. Or run the NFC Bridge server locally (see documentation)

The simulation mode allows you to test the full workflow without hardware.`,
    }));

    return false;
  }, [checkBridgeAvailability, connectToBridge]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      connected: false,
      deviceName: null,
      isScanning: false,
      cardPresent: false,
      connectionMethod: null,
    }));

    onDisconnect?.();
    console.log('NFC Reader disconnected');
  }, [onDisconnect]);

  // Start scanning for cards
  const startScanning = useCallback(async (): Promise<boolean> => {
    if (status.connectionMethod === 'bridge' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'startScanning' }));
      setStatus(prev => ({ ...prev, isScanning: true, error: null }));
      return true;
    }

    if (status.connectionMethod === 'simulation') {
      setStatus(prev => ({ ...prev, isScanning: true, error: null }));
      return true;
    }

    setStatus(prev => ({
      ...prev,
      error: 'No NFC reader connected. Use "Test Scan" for simulation mode.'
    }));
    return false;
  }, [status.connectionMethod]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (status.connectionMethod === 'bridge' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stopScanning' }));
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setStatus(prev => ({ ...prev, isScanning: false }));
    console.log('Stopped scanning for NFC cards');
  }, [status.connectionMethod]);

  // Simulate card scan (for testing) - this is the primary method for web-only usage
  const simulateScan = useCallback((uid?: string) => {
    const cardUID = uid || `04${Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
    ).join('')}`;

    setStatus(prev => ({
      ...prev,
      lastScannedUID: cardUID,
      connectionMethod: 'simulation',
      connected: true,
      deviceName: 'Simulation Mode',
      cardPresent: true,
    }));

    onCardScanned?.(cardUID);
    console.log('Simulated card scan:', cardUID);

    // Reset card present after a short delay
    setTimeout(() => {
      setStatus(prev => ({ ...prev, cardPresent: false }));
    }, 2000);

    return cardUID;
  }, [onCardScanned]);

  // Clear error
  const clearError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }));
  }, []);

  // Enable simulation mode directly
  const enableSimulationMode = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      connected: true,
      deviceName: 'Simulation Mode',
      connectionMethod: 'simulation',
      error: null,
    }));
    onConnect?.();
    console.log('Simulation mode enabled');
  }, [onConnect]);

  // Auto-check bridge availability on mount
  useEffect(() => {
    if (autoConnect) {
      checkBridgeAvailability();
    }
  }, [autoConnect, checkBridgeAvailability]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    requestDevice,
    disconnect,
    startScanning,
    stopScanning,
    simulateScan,
    clearError,
    checkBridgeAvailability,
    enableSimulationMode,
    connectToBridge,
  };
}

// Type augmentation
declare global {
  interface Navigator {
    usb?: {
      requestDevice: (options: { filters: Array<{ vendorId: number; productId?: number }> }) => Promise<USBDevice>;
      getDevices: () => Promise<USBDevice[]>;
      addEventListener: (type: string, listener: (event: any) => void) => void;
      removeEventListener: (type: string, listener: (event: any) => void) => void;
    };
    hid?: {
      requestDevice: (options: { filters: Array<{ vendorId: number; productId: number }> }) => Promise<HIDDevice[]>;
      getDevices: () => Promise<HIDDevice[]>;
      addEventListener: (type: string, listener: (event: any) => void) => void;
      removeEventListener: (type: string, listener: (event: any) => void) => void;
    };
  }
}
