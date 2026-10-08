-- 024: team roles, talent assignments, invite/reset links, login throttling, audit log
--
-- Team roles: admin (everything), manager (assigned talents, incl. fees),
-- road_manager (assigned talents' schedule and logistics, no money).
-- Run before deploying the code that uses it.

BEGIN;

-- Roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'road_manager', 'staff', 'artist', 'vip'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Which talents a manager or road manager looks after
CREATE TABLE IF NOT EXISTS talent_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, talent_id)
);
CREATE INDEX IF NOT EXISTS idx_talent_assignments_talent ON talent_assignments(talent_id);

-- One-time links to set a password (new account) or reset it.
-- Only a SHA-256 hash of the token is stored.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('invite', 'reset')),
  token_hash text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);

-- Sign-in attempts, for throttling repeated failures
CREATE TABLE IF NOT EXISTS login_attempts (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  ip text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, created_at);

-- Who changed what
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);

COMMIT;
