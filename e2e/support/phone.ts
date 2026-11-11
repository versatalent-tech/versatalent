import type { Page } from '@playwright/test';

/**
 * A pretend Android phone: Chrome's Web NFC (NDEFReader), with window.__tap()
 * holding a card to it. `granted` = NFC already allowed for the site.
 */
export async function pretendPhone(page: Page, granted = false) {
  await page.addInitScript((alreadyAllowed) => {
    const listeners: ((e: { serialNumber: string }) => void)[] = [];
    (window as any).__scans = 0;
    (window as any).NDEFReader = class {
      addEventListener(type: string, fn: (e: { serialNumber: string }) => void) {
        if (type === 'reading') listeners.push(fn);
      }
      async scan() {
        (window as any).__scans++;
      }
    };
    (window as any).__tap = (serialNumber: string) => listeners.forEach((fn) => fn({ serialNumber }));
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = ((d: PermissionDescriptor) =>
      d.name === ('nfc' as PermissionName)
        ? Promise.resolve({ state: alreadyAllowed ? 'granted' : 'prompt' } as PermissionStatus)
        : query(d)) as typeof navigator.permissions.query;
  }, granted);
}
