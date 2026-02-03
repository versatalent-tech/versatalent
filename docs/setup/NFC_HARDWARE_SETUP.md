# NFC Hardware Setup Guide

## Overview

This guide explains how to set up NFC card readers for customer linking at the POS system.

## NFC Options

### Option 1: Web NFC API (No Hardware Required)

**Supported Devices:**
- Android phones with Chrome browser
- NFC-enabled tablets

**Pros:**
- ✅ No additional hardware needed
- ✅ Works on mobile devices
- ✅ Already integrated in POS

**Cons:**
- ❌ Not supported on iOS
- ❌ Not supported on desktop browsers
- ❌ Requires Chrome/Edge browser

**Status:** ✅ Already implemented in `NFCReader` component

### Option 2: USB NFC Reader (Desktop)

**Recommended Readers:**
- ACR122U USB NFC Reader (~$40)
- HID OMNIKEY 5022 CL (~$50)
- Identiv uTrust 3700 F (~$45)

**Pros:**
- ✅ Works on any computer
- ✅ Reliable and fast
- ✅ Professional setup

**Cons:**
- ❌ Requires USB port
- ❌ Additional cost
- ❌ Requires driver installation

### Option 3: Bluetooth NFC Reader (Mobile)

**Recommended:**
- Socket Mobile S550 (~$200)
- Identiv uTrust 3700 BT (~$150)

**Pros:**
- ✅ Wireless operation
- ✅ Works with tablets
- ✅ Portable

**Cons:**
- ❌ Higher cost
- ❌ Requires pairing
- ❌ Battery management

## Setup Option 1: Web NFC (Mobile)

### Requirements

- Android phone or tablet
- Chrome browser (version 89+)
- HTTPS connection (or localhost)

### Setup Steps

1. **Open POS on mobile device:**
   ```
   https://yourdomain.com/pos
   ```

2. **Login as staff**

3. **Click "Link Customer (NFC)"**

4. **Tap "Tap Card Now" button**

5. **Hold NFC card to back of phone**

6. **Customer linked automatically**

### Troubleshooting Web NFC

**"NFC not supported"**
- Check device has NFC hardware
- Enable NFC in phone settings
- Use Chrome or Edge browser
- Ensure HTTPS (not HTTP)

**"Permission denied"**
- Grant NFC permission when prompted
- Check Chrome site settings
- Clear browser cache

**"No NFC card detected"**
- Hold card closer (within 4cm)
- Remove phone case if thick
- Try different position/angle
- Ensure card is NFC-enabled

## Setup Option 2: USB NFC Reader

### ACR122U Setup (Most Common)

#### Windows

1. **Download drivers:**
   - Go to: https://www.acs.com.hk/en/driver/3/acr122u-usb-nfc-reader/
   - Download latest Windows driver
   - Extract and run installer

2. **Connect reader:**
   - Plug USB cable into computer
   - Green LED should light up
   - Check Device Manager for "ACR122U"

3. **Install Node.js package:**
   ```bash
   cd versatalent
   bun add nfc-pcsc
   ```

4. **Create NFC service:**
   Create: `src/lib/services/nfc-reader-service.ts`

   ```typescript
   import { NFC } from 'nfc-pcsc';

   export class NFCReaderService {
     private nfc: any;
     private reader: any;

     constructor() {
       this.nfc = new NFC();
     }

     start(onCardRead: (uid: string) => void) {
       this.nfc.on('reader', (reader: any) => {
         console.log('NFC reader detected:', reader.name);
         this.reader = reader;

         reader.on('card', (card: any) => {
           const uid = card.uid.toString('hex').toUpperCase();
           console.log('Card detected:', uid);
           onCardRead(uid);
         });

         reader.on('card.off', () => {
           console.log('Card removed');
         });

         reader.on('error', (err: any) => {
           console.error('Reader error:', err);
         });
       });

       this.nfc.on('error', (err: any) => {
         console.error('NFC error:', err);
       });
     }

     stop() {
       if (this.reader) {
         this.reader.close();
       }
     }
   }
   ```

5. **Create API endpoint:**
   Create: `src/app/api/pos/nfc/start-reader/route.ts`

   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { NFCReaderService } from '@/lib/services/nfc-reader-service';

   let readerService: NFCReaderService | null = null;

   export async function POST(request: NextRequest) {
     if (!readerService) {
       readerService = new NFCReaderService();

       readerService.start((uid) => {
         // Store UID in memory or emit to connected clients
         console.log('Card read:', uid);
       });

       return NextResponse.json({
         success: true,
         message: 'NFC reader started'
       });
     }

     return NextResponse.json({
       success: true,
       message: 'Reader already running'
     });
   }
   ```

#### macOS

1. **Install libusb:**
   ```bash
   brew install libusb
   ```

2. **No drivers needed** - works out of box

3. **Follow steps 3-5 from Windows**

#### Linux

1. **Install dependencies:**
   ```bash
   sudo apt-get install libusb-1.0-0-dev libudev-dev
   ```

2. **Add udev rules:**
   Create: `/etc/udev/rules.d/50-nfc.rules`
   ```
   SUBSYSTEM=="usb", ATTRS{idVendor}=="072f", ATTRS{idProduct}=="2200", MODE="0666"
   ```

3. **Reload udev:**
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

4. **Follow steps 3-5 from Windows**

### Testing USB Reader

```bash
# Test if reader is detected
cd versatalent
node -e "const {NFC} = require('nfc-pcsc'); const nfc = new NFC(); nfc.on('reader', r => console.log('Found:', r.name));"
```

Should output: `Found: ACS ACR122U` (or your reader model)

## Setup Option 3: Bluetooth NFC Reader

### Socket Mobile S550 Setup

1. **Charge the reader**

2. **Pair with device:**
   - Turn on reader (LED blinks blue)
   - Open Bluetooth settings
   - Select "Socket S550"
   - Enter PIN: 1234

3. **Install SDK:**
   ```bash
   bun add @socketmobile/capture
   ```

4. **Create service:**
   Create: `src/lib/services/socket-nfc-service.ts`

   ```typescript
   import CaptureSDK from '@socketmobile/capture';

   export class SocketNFCService {
     private capture: any;

     async start(onCardRead: (uid: string) => void) {
       this.capture = new CaptureSDK();

       await this.capture.open({
         appId: 'your-app-id',
         developerId: 'your-developer-id',
         appKey: 'your-app-key'
       });

       this.capture.on('decodedData', (data: any) => {
         const uid = data.dataString;
         onCardRead(uid);
       });
     }

     stop() {
       if (this.capture) {
         this.capture.close();
       }
     }
   }
   ```

5. **Get credentials:**
   - Register at: https://www.socketmobile.com/developer
   - Create application
   - Get App ID, Developer ID, App Key

## Integration with POS

### Current Implementation

The `NFCReader` component already supports:

1. **Web NFC** (mobile devices)
2. **Manual UID entry** (any reader)

### For USB/Bluetooth Readers

The manual entry method works with ALL readers:

1. Reader detects card
2. Gets UID (e.g., "AB12CD34")
3. Staff enters UID in POS
4. Customer linked

### Auto-linking (Advanced)

For automatic linking without manual entry:

1. **Create WebSocket server:**
   ```typescript
   // src/lib/websocket/nfc-server.ts
   import { WebSocketServer } from 'ws';

   const wss = new WebSocketServer({ port: 8080 });

   wss.on('connection', (ws) => {
     console.log('POS connected to NFC server');

     // When USB reader detects card
     readerService.on('card', (uid) => {
       ws.send(JSON.stringify({ uid }));
     });
   });
   ```

2. **Connect POS to WebSocket:**
   ```typescript
   // In POS page
   useEffect(() => {
     const ws = new WebSocket('ws://localhost:8080');

     ws.onmessage = (event) => {
       const { uid } = JSON.parse(event.data);
       handleCardRead(uid);
     };

     return () => ws.close();
   }, []);
   ```

## Recommended Setup by Use Case

### Small Business (1-2 POS stations)

**Recommendation:** Web NFC on tablet

- **Cost:** $0 (use existing tablet)
- **Setup:** 5 minutes
- **Pros:** No hardware, easy setup
- **Cons:** Android only

### Medium Business (3-5 POS stations)

**Recommendation:** USB NFC readers (ACR122U)

- **Cost:** $40 per station
- **Setup:** 30 minutes per station
- **Pros:** Reliable, fast, works anywhere
- **Cons:** Requires USB port

### Large Business (6+ POS stations)

**Recommendation:** Mix of USB and Bluetooth

- **Cost:** $50-200 per station
- **Setup:** 1 hour per station
- **Pros:** Flexible, professional
- **Cons:** Higher cost

## NFC Card Types

### Supported Cards

- ✅ NTAG213/215/216
- ✅ MIFARE Classic 1K/4K
- ✅ MIFARE Ultralight
- ✅ ISO14443A compatible
- ✅ NFC Forum Type 2/4

### Where to Buy

**Blank NFC Cards:**
- Amazon: Search "NTAG216 NFC cards"
- AliExpress: Bulk orders (100+ cards)
- NFC Tag Shop: https://www.nfctagshop.com
- TagsForDroid: https://tagsfordroid.com

**Cost:** $0.50 - $2.00 per card

### Writing Card UIDs

Most NFC cards have **fixed UIDs** (printed on card).

**If you need custom UIDs:**
- Buy "Magic" NTAG cards
- Use NFC Tools app to write UID
- Not recommended (security risk)

## Testing NFC Integration

### Test Card Detection

1. **Prepare test card** with known UID
2. **Open POS**: http://localhost:3000/pos
3. **Click "Link Customer (NFC)"**
4. **Method 1 (Web NFC):**
   - Click "Tap Card Now"
   - Hold card to phone
   - Should link automatically

5. **Method 2 (Manual):**
   - Enter UID (e.g., "AB12CD34")
   - Click "Link"
   - Should link customer

### Expected Behavior

✅ **Success:**
- "Customer linked: John Doe"
- Customer info appears in cart
- Tier and points shown (if VIP)

❌ **Errors:**
- "NFC card not found" - Card not registered
- "Card inactive" - Card disabled in admin
- "User not found" - Database issue

## Troubleshooting

### Reader Not Detected

**USB Reader:**
- Check USB connection
- Install/update drivers
- Try different USB port
- Check Device Manager (Windows)

**Bluetooth Reader:**
- Charge the reader
- Re-pair device
- Check Bluetooth settings
- Update firmware

### Card Not Reading

**Distance:**
- Hold card within 4cm of reader
- Remove thick cases
- Avoid metal surfaces

**Card:**
- Verify card is NFC-enabled
- Check card isn't damaged
- Test with NFC Tools app

**Reader:**
- Restart reader
- Update drivers
- Try different card

### Performance Issues

**Slow reads:**
- Check reader firmware
- Update drivers
- Reduce USB cable length
- Avoid USB hubs

**Inconsistent:**
- Clean reader surface
- Replace damaged cards
- Update software

## Security Considerations

### Card Cloning

NFC cards can be cloned. Mitigate by:
- Use encrypted NTAG cards
- Implement server-side validation
- Monitor for duplicate scans
- Regular security audits

### Access Control

- Only staff can link customers
- Auth required for POS access
- Log all card scans
- Alert on suspicious activity

## Next Steps

1. **Choose your NFC option:**
   - Web NFC (free, mobile only)
   - USB reader (reliable, desktop)
   - Bluetooth (flexible, expensive)

2. **Order hardware** (if needed)

3. **Follow setup guide** for your option

4. **Test with sample cards**

5. **Train staff** on usage

6. **Order NFC cards** for customers

7. **Go live!** 🚀

---

**Quick Start:**
- Use Web NFC on Android tablet (easiest)
- Or manual entry with any reader (works now)
- Or set up USB reader (most reliable)
