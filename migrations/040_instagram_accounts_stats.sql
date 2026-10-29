-- 040: Connected Instagram accounts and their post statistics
--
-- Talents (from the portal) and VersaTalent (from the admin) connect their
-- Instagram professional account with "Business Login for Instagram". The
-- site asks only for basic profile data and insights: never messages, never
-- comment text. A nightly job saves each account's follower count and each
-- recent post's figures, one row per day, so growth over time can be shown.
--
-- Tokens are stored encrypted (AES-256-GCM, key in INSTAGRAM_TOKEN_KEY) and
-- removed when the account is disconnected. A data deletion request from
-- Meta deletes the account and everything collected for it.

BEGIN;

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_user_id text NOT NULL UNIQUE,                -- Instagram professional account ID (/me user_id)
  ig_app_user_id text,                            -- app-scoped ID (/me id), used by Meta's callbacks
  talent_id uuid UNIQUE REFERENCES talents(id) ON DELETE CASCADE,  -- NULL = VersaTalent's own account
  username text NOT NULL,
  account_type text,
  profile_picture_url text,
  followers_count integer,
  media_count integer,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'disconnected')),
  access_token_enc text,                          -- NULL once disconnected
  token_expires_at timestamptz,
  token_refreshed_at timestamptz,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  connected_by uuid REFERENCES users(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'connected' OR access_token_enc IS NOT NULL)
);
-- Only one VersaTalent account
CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_accounts_agency ON instagram_accounts ((talent_id IS NULL)) WHERE talent_id IS NULL;

CREATE TABLE IF NOT EXISTS instagram_media (
  id text PRIMARY KEY,                            -- Instagram media ID
  account_id uuid NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  shortcode text,
  media_type text,                                -- IMAGE, VIDEO, CAROUSEL_ALBUM
  media_product_type text,                        -- FEED, REELS
  caption text,
  caption_length integer NOT NULL DEFAULT 0,
  hashtag_count integer NOT NULL DEFAULT 0,
  permalink text,
  posted_at timestamptz NOT NULL,
  -- Latest figures (also kept per day in instagram_media_snapshots)
  views integer,
  reach integer,
  likes integer,
  comments integer,
  saved integer,
  shares integer,
  total_interactions integer,
  follows integer,
  profile_visits integer,
  avg_watch_time_ms integer,
  metrics_updated_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_instagram_media_account ON instagram_media (account_id, posted_at DESC);

CREATE TABLE IF NOT EXISTS instagram_media_snapshots (
  media_id text NOT NULL REFERENCES instagram_media(id) ON DELETE CASCADE,
  taken_on date NOT NULL,
  views integer,
  reach integer,
  likes integer,
  comments integer,
  saved integer,
  shares integer,
  total_interactions integer,
  follows integer,
  profile_visits integer,
  avg_watch_time_ms integer,
  PRIMARY KEY (media_id, taken_on)
);

CREATE TABLE IF NOT EXISTS instagram_account_snapshots (
  account_id uuid NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  taken_on date NOT NULL,
  followers_count integer,
  media_count integer,
  PRIMARY KEY (account_id, taken_on)
);

-- Data deletion requests from Meta, so the person can check theirs was done
CREATE TABLE IF NOT EXISTS instagram_deletion_requests (
  confirmation_code text PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

COMMIT;
