-- 027: talent portal - artist perks (set by admins) and talent profile change requests
--
-- Talents sign in with their existing 'artist' user account (users.talent_id).
-- Points come from the existing VIP membership on that account.

BEGIN;

CREATE TABLE IF NOT EXISTS artist_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  talent_id uuid REFERENCES talents(id) ON DELETE CASCADE, -- NULL = every artist
  min_tier text CHECK (min_tier IS NULL OR min_tier IN ('silver', 'gold', 'black')),
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);
CREATE INDEX IF NOT EXISTS idx_artist_perks_talent ON artist_perks (talent_id);

-- Edits a talent proposes to their public profile; an admin approves them
CREATE TABLE IF NOT EXISTS talent_profile_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changes jsonb NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON talent_profile_changes (status, created_at DESC);
-- At most one pending request per talent
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_changes_one_pending ON talent_profile_changes (talent_id) WHERE status = 'pending';

COMMIT;
