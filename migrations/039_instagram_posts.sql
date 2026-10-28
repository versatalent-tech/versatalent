-- 039: Instagram posts featured on the website
--
-- Admins pick posts and reels to show on the homepage and on each talent's
-- profile; the site shows them with Instagram's own embed. Only the post's
-- code is stored (the link is rebuilt from it), so every way of writing the
-- same link ends up as one row.
--
-- talent_id NULL means a post from VersaTalent's own account.
--
-- Also moves the five posts that were written into the code
-- (src/lib/services/instagram-service.ts) onto their talents, matched by the
-- Instagram link saved on each talent.

BEGIN;

CREATE TABLE IF NOT EXISTS instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode text NOT NULL UNIQUE CHECK (shortcode ~ '^[A-Za-z0-9_-]{5,40}$'),
  kind text NOT NULL DEFAULT 'p' CHECK (kind IN ('p', 'reel', 'tv')),
  talent_id uuid REFERENCES talents(id) ON DELETE CASCADE,
  on_homepage boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_talent ON instagram_posts (talent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_homepage ON instagram_posts (sort_order) WHERE on_homepage AND is_visible;

INSERT INTO instagram_posts (shortcode, kind, talent_id, sort_order)
SELECT v.shortcode, v.kind, t.id, v.sort_order
FROM (VALUES
  ('DOy39hlDF8p', 'p', 'deejaywg_', 0),
  ('DPRrq80CBl1', 'p', 'deejaywg_', 1),
  ('DLzdlCNC4JY', 'p', 'miss_chocolatinha', 0),
  ('DJRlKRuiq4w', 'p', 'miss_chocolatinha', 1),
  ('DKMehnEMRSi', 'reel', 'joaorodolfo_official', 0)
) AS v (shortcode, kind, handle, sort_order)
JOIN LATERAL (
  SELECT id FROM talents
  WHERE rtrim(regexp_replace(lower(social_links->>'instagram'), '^https?://(www\.)?instagram\.com/', ''), '/') = v.handle
  ORDER BY created_at
  LIMIT 1
) t ON true
ON CONFLICT (shortcode) DO NOTHING;

COMMIT;
