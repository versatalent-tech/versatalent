/**
 * The run's settings, set by scripts/e2e.mjs. Refuses to run without them,
 * and never against the live database.
 */
const LIVE_ENDPOINT = 'ep-royal-leaf-a4rl6jau';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} isn't set. Run the tests with "npm run test:e2e", which makes a temporary database copy.`);
  }
  return value;
}

export const DATABASE_URL = required('DATABASE_URL');
if (DATABASE_URL.includes(LIVE_ENDPOINT)) {
  throw new Error('DATABASE_URL is the live database. The tests only run against a copy.');
}

export const ADMIN = { username: required('ADMIN_USERNAME'), password: required('ADMIN_PASSWORD') };
export const SUMUP_MOCK = 'http://127.0.0.1:4010';
export const ADMIN_STATE = 'e2e/.auth/admin.json';
