-- VersaTalent Events System Migration
-- Run this SQL in your Neon database console after 003_vip_tier_benefits.sql

-- Events table for the main events/performances system
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('performance', 'photoshoot', 'match', 'collaboration', 'workshop', 'appearance')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),

  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  display_time TEXT, -- Human-readable time like "7:30 PM"

  -- Venue information (stored as JSONB for flexibility)
  venue JSONB NOT NULL DEFAULT '{}', -- {name, address, city, country, capacity, website}

  -- Media and display
  image_url TEXT,
  featured BOOLEAN DEFAULT FALSE,

  -- Ticketing and pricing
  tickets_url TEXT,
  price JSONB, -- {min, max, currency, isFree}

  -- Additional metadata
  tags TEXT[] DEFAULT '{}',
  organizer TEXT,
  expected_attendance INTEGER,
  talent_ids TEXT[] DEFAULT '{}', -- Array of talent IDs

  -- Publishing
  is_published BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured);
CREATE INDEX IF NOT EXISTS idx_events_is_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_talent_ids ON events USING GIN(talent_ids);

-- Composite index for common queries (published events ordered by time)
-- Note: Cannot use time-based WHERE clause as it requires IMMUTABLE functions
CREATE INDEX IF NOT EXISTS idx_events_published_upcoming ON events(is_published, start_time)
  WHERE is_published = TRUE;

-- Apply updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '^-+|-+$', '', 'g');

    -- Ensure uniqueness by appending UUID if needed
    IF EXISTS (SELECT 1 FROM events WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug := NEW.slug || '-' || substring(NEW.id::text, 1, 8);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_slug
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_event_slug();

-- Migrate existing events from static data
-- Note: Run this manually or via seed script after creating the table
-- Example seed data for 3 events:

INSERT INTO events (
  title,
  description,
  type,
  status,
  start_time,
  end_time,
  display_time,
  venue,
  image_url,
  featured,
  tickets_url,
  price,
  tags,
  organizer,
  expected_attendance,
  talent_ids
) VALUES
  (
    'La Gitane - Batida Quente',
    'Deejay WG headlines featuring a special set mixing Afrobeats, Amapiano, House music, Kizomba and more',
    'performance',
    'completed',
    '2024-10-10T22:00:00Z',
    '2024-10-11T03:00:00Z',
    '10:00 PM',
    '{"name": "La Gitane", "address": "Bridge Street", "city": "Manchester", "country": "UK"}',
    '/images/events/Batida_Quente.jpg',
    TRUE,
    'https://www.fatsoma.com/e/2zpafrr4/batida-quente-palop-world-music-sean-wilson-dj-wg-fabio-israel',
    '{"min": 7, "max": 10, "currency": "GBP"}',
    ARRAY['Nightclub', 'Afro House', 'Afrobeats', 'Kizomba'],
    'Palop Entertainment',
    100,
    ARRAY['1']
  ),
  (
    'La Gitane - Batida Quente - Halloween',
    'Deejay WG headlines featuring a special set mixing Afrobeats, Amapiano, House music, Kizomba and more for halloween',
    'performance',
    'completed',
    '2024-10-31T22:00:00Z',
    '2024-11-01T03:00:00Z',
    '10:00 PM',
    '{"name": "La Gitane", "address": "Bridge Street", "city": "Manchester", "country": "UK"}',
    '/images/events/Batida_Quente_Halloween.jpg',
    TRUE,
    'https://www.fatsoma.com/e/2yz12k9n/batida-quente-halloween-party-palop-world-music-sean-wilson-dj-fanta-dj-wg',
    '{"min": 7, "max": 10, "currency": "GBP"}',
    ARRAY['Nightclub', 'Afro House', 'Afrobeats', 'Kizomba'],
    'Palop Entertainment',
    100,
    ARRAY['1']
  ),
  (
    'VersaTalent Summer Showcase 2025',
    'Join us for an incredible evening featuring our top talent across music, modeling, and sports. Experience live performances, fashion shows, and meet-and-greet opportunities.',
    'performance',
    'upcoming',
    '2025-06-15T19:00:00Z',
    '2025-06-15T23:00:00Z',
    '7:00 PM',
    '{"name": "The Hanover Theatre", "address": "550 Main St", "city": "Worcester", "country": "USA", "capacity": 2300}',
    'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
    TRUE,
    NULL,
    '{"min": 25, "max": 75, "currency": "USD"}',
    ARRAY['Performance', 'Showcase', 'Fashion', 'Music'],
    'VersaTalent',
    500,
    ARRAY['1', '2', '3']
  )
ON CONFLICT DO NOTHING;

-- Sample query to verify installation
-- SELECT
--   id,
--   title,
--   type,
--   status,
--   start_time,
--   CASE
--     WHEN end_time >= NOW() THEN 'upcoming'
--     ELSE 'past'
--   END as calculated_status,
--   is_published
-- FROM events
-- WHERE is_published = TRUE
-- ORDER BY start_time DESC;
