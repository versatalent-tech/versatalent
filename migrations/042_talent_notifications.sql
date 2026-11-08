-- 042: notifications for talents (portal bell and phone push)
--
-- A notification is written when something changes for a talent: a task
-- given to them, a booking shared, confirmed, moved or cancelled, a profile
-- change reviewed, a document shared, a payout paid, and reminders the day
-- before. Stored per user, so other roles could get them later. Reminders
-- and payouts carry a dedupe_key so the hourly job and retries never send
-- the same thing twice. Each phone or browser that turned push on is a
-- push_subscriptions row; one the push service reports gone is deleted.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

COMMIT;
