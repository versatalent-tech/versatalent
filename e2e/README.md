# End-to-end tests (Playwright)

The tests drive the real site in a browser and through its API, against a
**temporary copy of the database** that's made for each run and deleted at
the end. Payments go to a pretend SumUp on your computer. Live data, real
cards and real emails are never touched.

## Run them

One-off setup:

1. In Neon: Account settings → API keys → **Create new API key**.
2. Copy `e2e/env.test.example` to `.env.test` in the project folder and paste the key.
3. `npx playwright install chromium`

Then:

```bash
npm run test:e2e
```

It makes the database copy, builds the site (into `.next-e2e`, separate from
`npm run dev`), runs every test, and deletes the copy. About 3 minutes.

Useful variations:

| Command | What it does |
| --- | --- |
| `npm run test:e2e -- tickets` | Only test files matching "tickets" |
| `npm run test:e2e -- --ui` | Playwright's interactive mode, to watch tests step by step |
| `E2E_SKIP_BUILD=1 npm run test:e2e` | Reuse the last build (when only tests changed) |
| `E2E_DEV=1 npm run test:e2e` | Run the site with `next dev` (slower, but no build) |
| `KEEP_TEST_DB=1 npm run test:e2e` | Keep the database copy afterwards, to look at it |
| `npm run test:e2e:report` | Open the last run's report (screenshots and traces of failures) |

## On GitHub

`.github/workflows/e2e.yml` runs the tests on every pull request and on
`main`. It needs the **`NEON_API_KEY`** repository secret (Settings → Secrets
and variables → Actions). Without it, the job is skipped.

This repository is public and the database copy holds real member details,
so on GitHub no screenshots, traces or reports are saved: only the list of
passed and failed tests. Run a failing test on your computer to see why.

## What's covered

| File | What it checks |
| --- | --- |
| `smoke.spec.ts` | Public pages load without errors; the ticket page fits a phone; the admin dashboard |
| `tickets.spec.ts` | Buying tickets end to end (decline, retry, pay), points for members and Gold rate, campaign tags, free tickets, ticket limits and the last-ticket race, sale dates, form checks, SumUp callbacks sent repeatedly, private order links, refunds taking back points, door list, analysis, spreadsheet-safe CSV |
| `talent-profile-stats.spec.ts` | Profile figures count only finished work; admin additions and hiding; access |
| `permissions.spec.ts` | Signed-out visitors and managers can't reach admin-only APIs and pages |
| `loyalty-ledger.spec.ts` | The points ledger: duplicates applied once, no negative balances, balances equal their entries |

## Writing tests

- Make your own data with the helpers in `e2e/support/db.ts` (`createEvent`,
  `createMember`, `createTalent`, …); every helper makes new, uniquely named
  rows, so tests never depend on each other or on live data.
- Admin API calls: `adminApi()`; a manager: `createTeamUser('manager')` then
  `teamApi(email, password)` (`e2e/support/auth.ts`).
- Payments: `checkoutsForOrder(orderId)` and `settle(checkoutId, 'paid')`
  (`e2e/support/sumup.ts`), or click Pay / Decline on the pretend page.
- Ticket orders from the API: `startOrder` / `placeOrder`, which use a
  different pretend connection address each time so the order limit per
  connection doesn't trip.
