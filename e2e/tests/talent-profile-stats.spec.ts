import { test, expect } from '@playwright/test';
import { createBooking, createEvent, createOrganisation, createTalent } from '../support/db';
import { adminApi } from '../support/auth';

test.describe('Talent profile figures', () => {
  test('count finished jobs, events and clients, and nothing else', async ({ page, request }) => {
    const talent = await createTalent();
    const [org1, org2] = [await createOrganisation(), await createOrganisation()];
    const pastEvent = await createEvent({ startsInDays: -10 });
    await createEvent({ startsInDays: -20, talentIds: [talent.id] }); // added to a past event
    await createEvent({ startsInDays: 20, talentIds: [talent.id] }); // future: not yet
    await createEvent({ startsInDays: -5, talentIds: [talent.id], status: 'cancelled' }); // cancelled: never

    await createBooking(talent.id, { status: 'completed', organisationId: org1.id }); // job
    await createBooking(talent.id, { status: 'confirmed', endedDaysAgo: 8, organisationId: org2.id }); // job (confirmed, finished)
    await createBooking(talent.id, { status: 'completed', organisationId: org1.id, eventId: pastEvent.id }); // counts as an event
    await createBooking(talent.id, { status: 'confirmed', startsInDays: 7, organisationId: org2.id }); // upcoming: not yet
    await createBooking(talent.id, { status: 'cancelled', organisationId: org2.id }); // cancelled: never
    await createBooking(talent.id, { status: 'hold' }); // hold: never

    const body = await (await request.get(`/api/talents/${talent.id}`)).json();
    expect(body.stats).toEqual([
      { key: 'jobs', value: 2, label: 'Jobs completed' },
      { key: 'events', value: 2, label: 'Events' },
      { key: 'clients', value: 2, label: 'Clients' },
    ]);

    await page.goto(`/talents/${talent.id}`);
    await expect(page.getByText('2 Jobs completed')).toBeVisible();
    await expect(page.getByText('2 Events')).toBeVisible();
    await expect(page.getByText('2 Clients')).toBeVisible();
    // The old photo-based figures are gone
    await expect(page.getByText(/Professional Shots|Recent Projects|Brand Collaborations/)).toHaveCount(0);
  });

  test('the admin adds earlier work and hides figures; zeros aren’t shown', async ({ request }) => {
    const talent = await createTalent();
    expect((await (await request.get(`/api/talents/${talent.id}`)).json()).stats).toEqual([]);

    const admin = await adminApi();
    const saved = await admin.put(`/api/talents/${talent.id}/stats`, {
      data: { jobs: { extra: 1, hidden: false }, events: { extra: 4, hidden: true }, clients: { extra: 0, hidden: false } },
    });
    expect(saved.status()).toBe(200);
    expect((await saved.json()).stats.jobs).toEqual({ counted: 0, extra: 1, hidden: false, total: 1 });

    // Singular label, hidden figure left out, zero left out
    expect((await (await request.get(`/api/talents/${talent.id}`)).json()).stats).toEqual([{ key: 'jobs', value: 1, label: 'Job completed' }]);

    const bad = await admin.put(`/api/talents/${talent.id}/stats`, {
      data: { jobs: { extra: -1, hidden: false }, events: { extra: 0, hidden: false }, clients: { extra: 0, hidden: false } },
    });
    expect((await bad.json()).error).toBe('Earlier work can’t be negative');

    // Saving the rest of the profile keeps the figures
    await admin.put(`/api/talents/${talent.id}`, { data: { tagline: 'Updated tagline' } });
    expect((await (await request.get(`/api/talents/${talent.id}`)).json()).stats).toHaveLength(1);
  });

  test('only admins can see or change the settings; inactive talents are hidden', async ({ request }) => {
    const talent = await createTalent();
    expect((await request.get(`/api/talents/${talent.id}/stats`)).status()).toBe(401);
    expect((await request.put(`/api/talents/${talent.id}/stats`, { data: {} })).status()).toBe(401);

    const gone = await createTalent({ active: false });
    expect((await request.get(`/api/talents/${gone.id}`)).status()).toBe(404);
  });
});
