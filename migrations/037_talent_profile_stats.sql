-- 037: Real figures in the talent profile hero
--
-- The hero used to count portfolio photos ("Professional Shots", "Recent
-- Projects", "Brand Collaborations"). It now shows jobs, events and clients
-- counted from bookings and events. Per figure, the admin can add work done
-- before it was recorded here, or hide it:
--   { "jobs": { "extra": 4, "hidden": false }, "events": {...}, "clients": {...} }

ALTER TABLE talents ADD COLUMN IF NOT EXISTS profile_stats jsonb NOT NULL DEFAULT '{}';
