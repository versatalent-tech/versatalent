import { test, expect } from '@playwright/test';
import { staffShareCents } from '../../src/lib/bookings/types';

test.describe('Share amounts', () => {
  test('£1,000 at 20% commission and a 10% rate is £20.00', () => {
    expect(staffShareCents(100_000, 20, 10)).toBe(2_000);
  });

  test('rounds to the penny from the rounded commission', () => {
    // commission 33,333 × 15% = 4,999.95 → 5,000; × 12.5% = 625
    expect(staffShareCents(33_333, 15, 12.5)).toBe(625);
  });

  test('no fee → null; no commission % or 0% rate → 0', () => {
    expect(staffShareCents(null, 20, 10)).toBeNull();
    expect(staffShareCents(100_000, null, 10)).toBe(0);
    expect(staffShareCents(100_000, 20, 0)).toBe(0);
  });
});
