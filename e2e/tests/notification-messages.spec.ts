import { test, expect } from '@playwright/test';
import type { Booking } from '../../src/lib/bookings/types';
import { bookingChanges, payoutPaid, taskAssigned } from '../../src/lib/notifications/messages';

/** Pure wording rules: no page or database */
function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    title: 'DJ set',
    status: 'hold',
    starts_at: '2026-11-14T21:00:00.000Z',
    ends_at: '2026-11-15T01:00:00.000Z',
    location: 'Leeds',
    call_time: '20:00',
    brief: null,
    logistics_notes: null,
    onsite_contact: {},
    talent: { id: 't1', name: 'Talent One' },
    deal: null,
    client: { id: 'c1', name: 'Secret Client Ltd' },
    event: null,
    client_visible_to_talent: false,
    shared_with_talent: true,
    talent_response: 'pending',
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

test.describe('Notification wording', () => {
  test('unshared booking → []', () => {
    expect(bookingChanges(null, booking({ shared_with_talent: false }))).toEqual([]);
    const before = booking({ shared_with_talent: false });
    expect(bookingChanges(before, { ...before, status: 'confirmed' })).toEqual([]);
  });

  test('created shared → one booking_shared', () => {
    const out = bookingChanges(null, booking());
    expect(out).toHaveLength(1);
    expect(out[0].talentId).toBe('t1');
    expect(out[0].message.kind).toBe('booking_shared');
    expect(out[0].message.title).toBe('New booking');
    expect(out[0].message.body).toContain('DJ set');
    expect(out[0].message.body).toContain('Sat 14 Nov, 21:00');
    expect(out[0].message.link).toBe('/portal/bookings');
  });

  test('shared and confirmed in one save → one booking_shared', () => {
    const before = booking({ shared_with_talent: false });
    const out = bookingChanges(before, booking({ status: 'confirmed', location: 'Lisbon' }));
    expect(out.map((n) => n.message.kind)).toEqual(['booking_shared']);
  });

  test('confirmed and cancelled', () => {
    expect(bookingChanges(booking(), booking({ status: 'confirmed' }))[0].message.title).toBe('Booking confirmed');
    const cancelled = bookingChanges(booking({ status: 'confirmed' }), booking({ status: 'cancelled', location: 'Lisbon' }));
    expect(cancelled.map((n) => n.message.title)).toEqual(['Booking cancelled']);
  });

  test('talent changed → cancelled to old, shared to new', () => {
    const out = bookingChanges(booking(), booking({ talent: { id: 't2', name: 'Talent Two' } }));
    expect(out.map((n) => [n.talentId, n.message.kind])).toEqual([
      ['t1', 'booking_cancelled'],
      ['t2', 'booking_shared'],
    ]);
  });

  test('moved → booking_changed body contains "New time"', () => {
    const out = bookingChanges(booking(), booking({ starts_at: '2026-11-14T22:00:00.000Z', location: 'Lisbon' }));
    expect(out).toHaveLength(1);
    expect(out[0].message.title).toBe('Booking changed');
    expect(out[0].message.body).toContain('New time: Sat 14 Nov, 22:00');
    expect(out[0].message.body).toContain('New location: Lisbon');
    expect(bookingChanges(booking(), booking({ brief: 'Changed brief' }))).toEqual([]);
  });

  test('client hidden unless allowed', () => {
    expect(bookingChanges(null, booking())[0].message.body).not.toContain('Secret Client');
    expect(bookingChanges(null, booking({ client_visible_to_talent: true }))[0].message.body).toContain('Secret Client Ltd');
  });

  test('payout body "£150.00 for <title>"', () => {
    const m = payoutPaid({ id: 'b1', title: 'DJ set', paid_cents: 15000, currency: 'GBP', paid_at: '2026-11-08T12:00:00.000Z' });
    expect(m.kind).toBe('payout_paid');
    expect(m.title).toBe('Payment sent');
    expect(m.body).toBe('£150.00 for DJ set');
    expect(m.link).toBe('/portal/earnings');
    expect(m.dedupeKey).toBe('payout_paid:b1:2026-11-08T12:00:00.000Z');
  });

  test('long subject cut to 80 with "…"', () => {
    const m = taskAssigned({ id: 'a1', subject: 'x'.repeat(300), due_at: null });
    expect(m.title).toBe('New to-do');
    expect(m.body.length).toBeLessThanOrEqual(200);
    expect(m.body.endsWith('…')).toBe(true);
    expect(taskAssigned({ id: 'a1', subject: 'Send the mix', due_at: '2026-11-12T17:00:00.000Z' }).body).toBe('Send the mix · due 12 Nov');
  });
});
