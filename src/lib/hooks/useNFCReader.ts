"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ACR122U USB identifiers
const ACR122U_VENDOR_ID = 0x072F; // ACS (Advanced Card Systems)

// ACR122U product IDs for different variants
const ACR122U_PRODUCT_IDS = [0x2200, 0x2214, 0x2210, 0x90CC];

// CCID interface class
const CCID_CLASS = 0x0B;

// APDU Commands for NFC operations
const APDU_COMMANDS = {
  // Get UID command for contactless cards
  GET_UID: new Uint8Array([0xFF, 0xCA, 0x00, 0x00, 0x00]),
  // Direct transmit wrapper
  DIRECT_TRANSMIT: new Uint8Array([0xFF, 0x00, 0x00, 0x00]),
  // LED control
  LED_ON: new Uint8Array([0xFF, 0x00, 0x40, 0x0F, 0x04, 0x00, 0x00, 0x00, 0x00]),
  LED_OFF: new Uint8Array([0xFF, 0x00, 0x40, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00]),
  // Buzzer
  BUZZER_ON: new Uint8Array([0xFF, 0x00, 0x52, 0xFF, 0x00]),
};

// CCID Message Types
const CCID_MSG = {
  PC_TO_RDR_XFRBLOCK: 0x6F,
  RDR_TO_PC_DATABLOCK: 0x80,
  PC_TO_RDR_ICCPOWERON: 0x62,
  RDR_TO_PC_SLOTSTATUS: 0x81,
};

export interface NFCReaderStatus {
  connected: boolean;
  deviceName: string | null;
  isScanning: boolean;
  lastScannedUID: string | null;
  error: string | null;
  supportsWebUSB: boolean;
  supportsWebHID: boolean;
  cardPresent: boolean;
  connectionMethod: 'webusb' | 'webhid' | 'simulation' | null;
}

export interface UseNFCReaderOptions {
  onCardScanned?: (uid: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export function useNFCReader(options: UseNFCReaderOptions = {}) {
  const { onCardScanned, onConnect, onDisconnect, onError, autoConnect = false } = options;

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
  });

  const usbDeviceRef = useRef<USBDevice | null>(null);
  const hidDeviceRef = useRef<HIDDevice | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceRef = useRef<number>(0);
  const endpointInRef = useRef<USBEndpoint | null>(null);
  const endpointOutRef = useRef<USBEndpoint | null>(null);

  // Check browser support
  useEffect(() => {
    const supportsWebUSB = typeof navigator !== 'undefined' && 'usb' in navigator;
    const supportsWebHID = typeof navigator !== 'undefined' && 'hid' in navigator;

    setStatus(prev => ({ ...prev, supportsWebUSB, supportsWebHID }));

    if (!supportsWebUSB && !supportsWebHID) {
      console.log('Neither WebUSB nor WebHID is supported in this browser');
    } else {
      console.log(`Browser support: WebUSB=${supportsWebUSB}, WebHID=${supportsWebHID}`);
    }
  }, []);

  // Helper to convert bytes to hex string
  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
  };

  // Build CCID XfrBlock message
  const buildCCIDMessage = useCallback((apdu: Uint8Array): Uint8Array => {
    const seq = sequenceRef.current++ % 256;
    const length = apdu.length;

    // CCID header (10 bytes) + APDU
    const message = new Uint8Array(10 + length);
    message[0] = CCID_MSG.PC_TO_RDR_XFRBLOCK;
    message[1] = length & 0xFF;
    message[2] = (length >> 8) & 0xFF;
    message[3] = (length >> 16) & 0xFF;
    message[4] = (length >> 24) & 0xFF;
    message[5] = 0x00;
    message[6] = seq;
    message[7] = 0x00;
    message[8] = 0x00;
    message[9] = 0x00;

    message.set(apdu, 10);

    return message;
  }, []);

  // Send APDU via WebUSB
  const sendAPDU = useCallback(async (apdu: Uint8Array): Promise<Uint8Array | null> => {
    const device = usbDeviceRef.current;
    const endpointIn = endpointInRef.current;
    const endpointOut = endpointOutRef.current;

    if (!device || !endpointIn || !endpointOut) {
      console.error('Device or endpoints not available');
      return null;
    }

    try {
      const message = buildCCIDMessage(apdu);
      await device.transferOut(endpointOut.endpointNumber, message);
      const result = await device.transferIn(endpointIn.endpointNumber, 64);

      if (result.data && result.data.byteLength > 10) {
        const responseData = new Uint8Array(result.data.buffer);
        const dataLength = responseData[1] | (responseData[2] << 8) | (responseData[3] << 16) | (responseData[4] << 24);

        if (dataLength > 0) {
          return responseData.slice(10, 10 + dataLength);
        }
      }

      return null;
    } catch (err) {
      console.error('Error sending APDU:', err);
      return null;
    }
  }, [buildCCIDMessage]);

  // Read card UID
  const readCardUID = useCallback(async (): Promise<string | null> => {
    const response = await sendAPDU(APDU_COMMANDS.GET_UID);

    if (response && response.length >= 4) {
      const sw1 = response[response.length - 2];
      const sw2 = response[response.length - 1];

      if (sw1 === 0x90 && sw2 === 0x00) {
        const uid = response.slice(0, response.length - 2);
        return bytesToHex(uid);
      } else if (sw1 === 0x63 && sw2 === 0x00) {
        return null;
      }
    }

    return null;
  }, [sendAPDU]);

  // Connect via WebUSB
  const connectWebUSB = useCallback(async (): Promise<boolean> => {
    if (!status.supportsWebUSB) {
      return false;
    }

    try {
      const filters = ACR122U_PRODUCT_IDS.map(productId => ({
        vendorId: ACR122U_VENDOR_ID,
        productId,
      }));

      const device = await (navigator as any).usb.requestDevice({ filters });

      if (!device) {
        setStatus(prev => ({ ...prev, error: 'No device selected' }));
        return false;
      }

      await device.open();

      let ccidInterface: USBInterface | null = null;
      for (const config of device.configurations) {
        for (const iface of config.interfaces) {
          for (const alt of iface.alternates) {
            if (alt.interfaceClass === CCID_CLASS) {
              ccidInterface = iface;
              break;
            }
          }
          if (ccidInterface) break;
        }
        if (ccidInterface) break;
      }

      if (!ccidInterface) {
        ccidInterface = device.configuration?.interfaces[0] || null;
      }

      if (!ccidInterface) {
        await device.close();
        setStatus(prev => ({ ...prev, error: 'No compatible interface found on device' }));
        return false;
      }

      await device.claimInterface(ccidInterface.interfaceNumber);

      const alternate = ccidInterface.alternate;
      for (const endpoint of alternate.endpoints) {
        if (endpoint.type === 'bulk') {
          if (endpoint.direction === 'in') {
            endpointInRef.current = endpoint;
          } else {
            endpointOutRef.current = endpoint;
          }
        }
      }

      if (!endpointInRef.current || !endpointOutRef.current) {
        await device.close();
        setStatus(prev => ({ ...prev, error: 'Could not find bulk endpoints' }));
        return false;
      }

      usbDeviceRef.current = device;
      setStatus(prev => ({
        ...prev,
        connected: true,
        deviceName: device.productName || 'ACR122U NFC Reader',
        error: null,
        connectionMethod: 'webusb',
      }));

      onConnect?.();
      console.log('NFC Reader connected via WebUSB:', device.productName);
      return true;

    } catch (err: any) {
      console.error('WebUSB connection error:', err);

      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        setStatus(prev => ({ ...prev, error: null }));
        return false;
      }

      if (err.name === 'SecurityError') {
        setStatus(prev => ({
          ...prev,
          error: 'USB access denied. Make sure you are on HTTPS or localhost.'
        }));
        return false;
      }

      if (err.name === 'NetworkError' || err.message?.includes('Unable to claim interface')) {
        setStatus(prev => ({
          ...prev,
          error: 'Device is busy. Close other applications using the NFC reader and try again.'
        }));
        return false;
      }

      setStatus(prev => ({
        ...prev,
        error: `Connection failed: ${err.message || 'Unknown error'}`
      }));
      onError?.(err.message || 'Connection failed');
      return false;
    }
  }, [status.supportsWebUSB, onConnect, onError]);

  // Connect via WebHID (fallback)
  const connectWebHID = useCallback(async (): Promise<boolean> => {
    if (!status.supportsWebHID) {
      return false;
    }

    try {
      const filters = ACR122U_PRODUCT_IDS.map(productId => ({
        vendorId: ACR122U_VENDOR_ID,
        productId,
      }));

      const devices = await (navigator as any).hid.requestDevice({ filters });

      if (devices.length === 0) {
        setStatus(prev => ({ ...prev, error: 'No device selected' }));
        return false;
      }

      const device = devices[0];

      if (!device.opened) {
        await device.open();
      }

      hidDeviceRef.current = device;
      setStatus(prev => ({
        ...prev,
        connected: true,
        deviceName: device.productName || 'ACR122U NFC Reader',
        error: null,
        connectionMethod: 'webhid',
      }));

      onConnect?.();
      console.log('NFC Reader connected via WebHID:', device.productName);
      return true;

    } catch (err: any) {
      console.error('WebHID connection error:', err);

      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        setStatus(prev => ({ ...prev, error: null }));
        return false;
      }

      setStatus(prev => ({
        ...prev,
        error: `HID connection failed: ${err.message || 'Unknown error'}`
      }));
      return false;
    }
  }, [status.supportsWebHID, onConnect]);

  // Main connect function
  const requestDevice = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, error: null }));

    if (status.supportsWebUSB) {
      console.log('Attempting WebUSB connection...');
      const connected = await connectWebUSB();
      if (connected) return true;
    }

    if (status.supportsWebHID) {
      console.log('Attempting WebHID connection...');
      const connected = await connectWebHID();
      if (connected) return true;
    }

    if (!status.supportsWebUSB && !status.supportsWebHID) {
      setStatus(prev => ({
        ...prev,
        error: 'Your browser does not support USB or HID device access. Please use Chrome, Edge, or Opera.'
      }));
    }

    return false;
  }, [status.supportsWebUSB, status.supportsWebHID, connectWebUSB, connectWebHID]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (usbDeviceRef.current) {
      try {
        await usbDeviceRef.current.close();
      } catch (err) {
        console.error('Error closing USB device:', err);
      }
      usbDeviceRef.current = null;
    }

    if (hidDeviceRef.current) {
      try {
        await hidDeviceRef.current.close();
      } catch (err) {
        console.error('Error closing HID device:', err);
      }
      hidDeviceRef.current = null;
    }

    endpointInRef.current = null;
    endpointOutRef.current = null;

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
    if (!status.connected) {
      setStatus(prev => ({ ...prev, error: 'No NFC reader connected' }));
      return false;
    }

    if (pollingIntervalRef.current) {
      return true;
    }

    setStatus(prev => ({ ...prev, isScanning: true, error: null }));
    console.log('Started scanning for NFC cards...');

    pollingIntervalRef.current = setInterval(async () => {
      if (status.connectionMethod === 'webusb' && usbDeviceRef.current) {
        const uid = await readCardUID();

        if (uid) {
          if (uid !== status.lastScannedUID) {
            setStatus(prev => ({
              ...prev,
              lastScannedUID: uid,
              cardPresent: true,
            }));
            onCardScanned?.(uid);
            console.log('Card scanned:', uid);
          }
        } else {
          if (status.cardPresent) {
            setStatus(prev => ({ ...prev, cardPresent: false }));
          }
        }
      }
    }, 500);

    return true;
  }, [status.connected, status.connectionMethod, status.lastScannedUID, status.cardPresent, readCardUID, onCardScanned]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setStatus(prev => ({ ...prev, isScanning: false }));
    console.log('Stopped scanning for NFC cards');
  }, []);

  // Simulate card scan (for testing)
  const simulateScan = useCallback((uid?: string) => {
    const cardUID = uid || `SIM-${Date.now().toString(16).toUpperCase()}`;
    setStatus(prev => ({
      ...prev,
      lastScannedUID: cardUID,
      connectionMethod: 'simulation',
    }));
    onCardScanned?.(cardUID);
    console.log('Simulated card scan:', cardUID);
    return cardUID;
  }, [onCardScanned]);

  // Clear error
  const clearError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }));
  }, []);

  // Check for already-authorized devices
  const checkForDevices = useCallback(async () => {
    if (status.supportsWebUSB) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        const acr122u = devices.find((device: USBDevice) =>
          device.vendorId === ACR122U_VENDOR_ID &&
          ACR122U_PRODUCT_IDS.includes(device.productId)
        );

        if (acr122u) {
          console.log('Found previously authorized ACR122U via WebUSB');
          try {
            await acr122u.open();

            let ccidInterface: USBInterface | null = null;
            for (const config of acr122u.configurations) {
              for (const iface of config.interfaces) {
                for (const alt of iface.alternates) {
                  if (alt.interfaceClass === CCID_CLASS) {
                    ccidInterface = iface;
                    break;
                  }
                }
                if (ccidInterface) break;
              }
              if (ccidInterface) break;
            }

            if (!ccidInterface) {
              ccidInterface = acr122u.configuration?.interfaces[0] || null;
            }

            if (ccidInterface) {
              await acr122u.claimInterface(ccidInterface.interfaceNumber);

              const alternate = ccidInterface.alternate;
              for (const endpoint of alternate.endpoints) {
                if (endpoint.type === 'bulk') {
                  if (endpoint.direction === 'in') {
                    endpointInRef.current = endpoint;
                  } else {
                    endpointOutRef.current = endpoint;
                  }
                }
              }

              if (endpointInRef.current && endpointOutRef.current) {
                usbDeviceRef.current = acr122u;
                setStatus(prev => ({
                  ...prev,
                  connected: true,
                  deviceName: acr122u.productName || 'ACR122U NFC Reader',
                  connectionMethod: 'webusb',
                }));
                onConnect?.();
                return;
              }
            }
          } catch (err) {
            console.error('Failed to auto-connect to device:', err);
          }
        }
      } catch (err) {
        console.error('Error checking WebUSB devices:', err);
      }
    }

    if (status.supportsWebHID) {
      try {
        const devices = await (navigator as any).hid.getDevices();
        const acr122u = devices.find((device: HIDDevice) =>
          device.vendorId === ACR122U_VENDOR_ID &&
          ACR122U_PRODUCT_IDS.includes(device.productId)
        );

        if (acr122u) {
          console.log('Found previously authorized ACR122U via WebHID');
          try {
            if (!acr122u.opened) {
              await acr122u.open();
            }
            hidDeviceRef.current = acr122u;
            setStatus(prev => ({
              ...prev,
              connected: true,
              deviceName: acr122u.productName || 'ACR122U NFC Reader',
              connectionMethod: 'webhid',
            }));
            onConnect?.();
          } catch (err) {
            console.error('Failed to auto-connect via WebHID:', err);
          }
        }
      } catch (err) {
        console.error('Error checking WebHID devices:', err);
      }
    }
  }, [status.supportsWebUSB, status.supportsWebHID, onConnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && (status.supportsWebUSB || status.supportsWebHID)) {
      checkForDevices();
    }
  }, [autoConnect, status.supportsWebUSB, status.supportsWebHID, checkForDevices]);

  // USB disconnect listener
  useEffect(() => {
    if (!status.supportsWebUSB) return;

    const handleDisconnect = (event: any) => {
      if (usbDeviceRef.current === event.device) {
        console.log('USB device disconnected');
        usbDeviceRef.current = null;
        endpointInRef.current = null;
        endpointOutRef.current = null;

        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
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
      }
    };

    (navigator as any).usb.addEventListener('disconnect', handleDisconnect);

    return () => {
      (navigator as any).usb.removeEventListener('disconnect', handleDisconnect);
    };
  }, [status.supportsWebUSB, onDisconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
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
    checkForDevices,
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
