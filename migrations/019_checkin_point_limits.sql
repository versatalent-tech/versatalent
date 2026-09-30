-- Migration 019: limit check-in points
--
-- Check-ins are still all recorded (checkins table), but points are awarded
-- at most once per member per award key:
--   'event:<nfc_event_id>'  a check-in to an event taking place today (UK time)
--   'day:YYYY-MM-DD'        any other check-in, once per UK calendar day
--
-- The primary key makes claiming an award atomic, so simultaneous taps or
-- page reloads can't both earn points.

CREATE TABLE IF NOT EXISTS vip_checkin_awards (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  award_key TEXT NOT NULL,
  checkin_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, award_key)
);

COMMENT ON TABLE vip_checkin_awards IS 'One row per check-in points award; prevents awarding the same event/day twice';
