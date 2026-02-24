-- VersaTalent Events Systems Integration
-- Run this SQL in your Neon database console after 004_events_system.sql
-- This migration safely integrates nfc_events with the main events table

-- Add optional reference from nfc_events to main events table
-- This allows linking NFC check-in events to public website events
ALTER TABLE nfc_events 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nfc_events_event_id ON nfc_events(event_id);

-- Add helpful comment
COMMENT ON COLUMN nfc_events.event_id IS 'Optional reference to main events table for public events with NFC check-in capability';

-- Helper function to sync event creation
-- When a public event is created, optionally create an nfc_event for check-ins
CREATE OR REPLACE FUNCTION create_nfc_event_from_event(
  p_event_id UUID,
  p_enable_checkins BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_nfc_event_id UUID;
  v_event_record RECORD;
BEGIN
  -- Only create if check-ins are enabled
  IF NOT p_enable_checkins THEN
    RETURN NULL;
  END IF;

  -- Get the main event details
  SELECT * INTO v_event_record FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with id % not found', p_event_id;
  END IF;

  -- Create corresponding nfc_event
  INSERT INTO nfc_events (
    name,
    date,
    location,
    description,
    event_id,
    metadata
  ) VALUES (
    v_event_record.title,
    v_event_record.start_time,
    (v_event_record.venue->>'name') || ', ' || (v_event_record.venue->>'city'),
    v_event_record.description,
    p_event_id,
    jsonb_build_object(
      'synced_from_events', true,
      'created_at', NOW()
    )
  ) RETURNING id INTO v_nfc_event_id;

  RETURN v_nfc_event_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to find nfc_event for a main event
CREATE OR REPLACE FUNCTION get_nfc_event_for_event(p_event_id UUID)
RETURNS UUID AS $$
DECLARE
  v_nfc_event_id UUID;
BEGIN
  SELECT id INTO v_nfc_event_id
  FROM nfc_events
  WHERE event_id = p_event_id
  LIMIT 1;
  
  RETURN v_nfc_event_id;
END;
$$ LANGUAGE plpgsql;

-- View to see events with their NFC check-in status
CREATE OR REPLACE VIEW events_with_checkins AS
SELECT 
  e.*,
  ne.id as nfc_event_id,
  ne.is_active as checkins_enabled,
  COUNT(DISTINCT c.id) as total_checkins,
  COUNT(DISTINCT c.user_id) as unique_attendees
FROM events e
LEFT JOIN nfc_events ne ON ne.event_id = e.id
LEFT JOIN checkins c ON c.event_id = ne.id
WHERE e.is_published = TRUE
GROUP BY e.id, ne.id, ne.is_active;

-- Sample query to verify integration
-- SELECT 
--   title,
--   start_time,
--   nfc_event_id,
--   checkins_enabled,
--   total_checkins,
--   unique_attendees
-- FROM events_with_checkins
-- ORDER BY start_time DESC;
