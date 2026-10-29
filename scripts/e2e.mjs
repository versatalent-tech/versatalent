#!/usr/bin/env node
/**
 * Runs the Playwright tests against a temporary copy of the database.
 *
 *   npm run test:e2e                   all tests
 *   npm run test:e2e -- tickets        only files matching "tickets"
 *   npm run test:e2e -- --ui           Playwright's interactive mode
 *   KEEP_TEST_DB=1 npm run test:e2e    keep the copy afterwards (to inspect it)
 *   E2E_SKIP_BUILD=1 npm run test:e2e  reuse the last build (when only tests changed)
 *   E2E_DEV=1 npm run test:e2e         run the site with `next dev` instead of a build
 *
 * Settings come from the environment or a git-ignored .env.test file:
 *   NEON_API_KEY      Neon API key (Neon console → Account settings → API keys)
 *   NEON_PROJECT_ID   the VersaTalent Neon project (snowy-tooth-29200550)
 *   TEST_DATABASE_URL optional: use this database instead of making a copy
 *                     (never the live database: that's refused)
 *
 * The copy is a Neon branch of the live database made for this run and
 * deleted at the end, so tests can never change live data. Payments go to a
 * pretend SumUp (e2e/mocks/sumup.mjs); no email or card is ever charged.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NEON_API = 'https://console.neon.tech/api/v2';
const BRANCH_PREFIX = 'e2e-';
// The live database's compute endpoint: tests refuse to run against it
const LIVE_ENDPOINT = 'ep-royal-leaf-a4rl6jau';

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

async function neon(method, urlPath, body) {
  const response = await fetch(`${NEON_API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NEON_API_KEY}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Neon API ${method} ${urlPath}: ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForOperations(projectId, operations) {
  for (const op of operations ?? []) {
    for (let i = 0; i < 120; i++) {
      const { operation } = await neon('GET', `/projects/${projectId}/operations/${op.id}`);
      if (operation.status === 'finished') break;
      if (['failed', 'error', 'cancelled'].includes(operation.status)) throw new Error(`Neon operation ${op.action} ${operation.status}`);
      await sleep(1000);
    }
  }
}

/** Delete copies left behind by runs that crashed (older than 2 hours) */
async function removeStaleBranches(projectId) {
  const { branches } = await neon('GET', `/projects/${projectId}/branches`);
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const b of branches) {
    if (b.name.startsWith(BRANCH_PREFIX) && !b.default && !b.protected && new Date(b.created_at).getTime() < cutoff) {
      console.log(`Removing an old test copy: ${b.name}`);
      await neon('DELETE', `/projects/${projectId}/branches/${b.id}`).catch((e) => console.warn(e.message));
    }
  }
}

/**
 * Make the copy. `onCreated` hears about it straight away, so it's deleted
 * even if a later step (waiting, connection details) fails.
 */
async function createTestBranch(projectId, onCreated) {
  const name = `${BRANCH_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}`;
  console.log(`Making a temporary copy of the database (${name})…`);
  const created = await neon('POST', `/projects/${projectId}/branches`, {
    branch: { name },
    endpoints: [{ type: 'read_write' }],
  });
  const branch = { id: created.branch.id, name, url: null };
  onCreated(branch);
  if (created.branch.default) throw new Error('Neon returned the default branch; refusing to continue');
  await waitForOperations(projectId, created.operations);

  // Neon doesn't always include the connection details; ask for them if not
  branch.url = created.connection_uris?.[0]?.connection_uri ?? null;
  if (!branch.url) {
    const params = new URLSearchParams({
      branch_id: branch.id,
      database_name: created.databases?.[0]?.name ?? 'neondb',
      role_name: created.roles?.[0]?.name ?? 'neondb_owner',
      pooled: 'true',
    });
    branch.url = (await neon('GET', `/projects/${projectId}/connection_uri?${params}`)).uri ?? null;
  }
  if (!branch.url) throw new Error('Neon did not return a connection string for the test copy');
  return branch;
}

function assertNotLive(url) {
  if (url.includes(LIVE_ENDPOINT)) {
    throw new Error('This is the live database. The tests only run against a copy.');
  }
}

/**
 * The copy is made from the live database, so a new migration isn't in it
 * until it's been run on production. Migrations listed in
 * e2e/pending-migrations.txt are run on the copy first (never on the live
 * database: the caller has already checked). Each must be safe to run twice,
 * and end every statement with ";" at the end of a line.
 */
async function applyPendingMigrations(databaseUrl) {
  const list = path.join(ROOT, 'e2e', 'pending-migrations.txt');
  if (!existsSync(list)) return;
  const files = readFileSync(list, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (files.length === 0) return;

  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(databaseUrl);
  for (const file of files) {
    const text = readFileSync(path.join(ROOT, 'migrations', file), 'utf8');
    const statements = text
      .split(/\r?\n/)
      .filter((line) => !/^\s*--/.test(line))
      .join('\n')
      .split(/;\s*$/m)
      .map((statement) => statement.trim())
      .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
    await sql.transaction(statements.map((statement) => sql.query(statement)));
    console.log(`Ran ${file} on the test copy (not on production yet)`);
  }
}

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env.test'));
  const projectId = process.env.NEON_PROJECT_ID;
  let branch = null;
  let databaseUrl = process.env.TEST_DATABASE_URL;

  let deleting = false;
  const cleanUp = async () => {
    if (!branch || deleting) return;
    deleting = true;
    if (process.env.KEEP_TEST_DB === '1') {
      console.log(`Kept the test copy ${branch.name} (${branch.id}). Delete it in Neon when you're done.`);
      return;
    }
    console.log('Deleting the temporary database copy…');
    await neon('DELETE', `/projects/${projectId}/branches/${branch.id}`).catch((e) => console.warn(`Couldn't delete ${branch.name}: ${e.message}`));
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      await cleanUp();
      process.exit(130);
    });
  }
  // Anything that goes wrong from here on still deletes the copy
  const fail = async (message, exitCode = 1) => {
    console.error(message);
    await cleanUp();
    process.exit(exitCode);
  };

  if (!databaseUrl) {
    if (!process.env.NEON_API_KEY || !projectId) {
      console.error('Set NEON_API_KEY and NEON_PROJECT_ID (in .env.test or the environment), or TEST_DATABASE_URL.');
      process.exit(2);
    }
    await removeStaleBranches(projectId).catch((e) => console.warn(`Couldn't tidy old test copies: ${e.message}`));
    try {
      await createTestBranch(projectId, (b) => (branch = b));
    } catch (error) {
      await fail(error.message);
    }
    databaseUrl = branch.url;
  }
  try {
    assertNotLive(databaseUrl);
    await applyPendingMigrations(databaseUrl);
  } catch (error) {
    await fail(error.message);
  }

  // Throwaway values for this run only
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: randomBytes(32).toString('hex'),
    ADMIN_USERNAME: 'e2e-admin',
    ADMIN_PASSWORD: randomBytes(18).toString('base64url'),
    SUMUP_API_BASE: 'http://127.0.0.1:4010',
    SUMUP_API_KEY: 'sup_sk_e2e_not_a_real_key',
    SUMUP_MERCHANT_CODE: 'ME2E0001',
    INSTAGRAM_OEMBED_BASE: 'http://127.0.0.1:4011',
    // Connecting accounts goes to the pretend Instagram too, and syncs run inline
    INSTAGRAM_MOCK_BASE: 'http://127.0.0.1:4011',
    INSTAGRAM_APP_ID: 'e2e-instagram-app',
    INSTAGRAM_APP_SECRET: randomBytes(24).toString('hex'),
    INSTAGRAM_TOKEN_KEY: randomBytes(32).toString('base64'),
    INSTAGRAM_SYNC_INLINE: '1',
    NEXT_TELEMETRY_DISABLED: '1',
  };
  delete env.ANTHROPIC_API_KEY; // AI notes stay off in tests
  delete env.NEON_API_KEY; // the app and tests don't need it

  // A production build in its own folder, so it never clashes with `npm run dev`
  env.NEXT_DIST_DIR = '.next-e2e';
  if (!process.env.E2E_DEV && !(process.env.E2E_SKIP_BUILD === '1' && existsSync(path.join(ROOT, '.next-e2e', 'BUILD_ID')))) {
    console.log('Building the site for the tests…');
    const built = await run('npx', ['next', 'build'], { ...env, NODE_ENV: 'production' });
    if (built !== 0) {
      await cleanUp();
      process.exit(built);
    }
  }

  let code = 1;
  try {
    code = await run('npx', ['playwright', 'test', ...process.argv.slice(2)], env);
  } finally {
    await cleanUp();
  }
  process.exit(code);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
