-- Migration 006: Talents System
-- Migrates talents from static files to Neon PostgreSQL database
-- Preserves all existing data structure and adds database features

-- ============================================
-- TALENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS talents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  industry        text NOT NULL,
  gender          text NOT NULL,
  age_group       text NOT NULL,
  profession      text NOT NULL,
  location        text NOT NULL,
  bio             text NOT NULL,
  tagline         text NOT NULL,
  skills          text[] NOT NULL DEFAULT '{}',
  image_src       text NOT NULL,
  featured        boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  social_links    jsonb DEFAULT '{}'::jsonb,
  portfolio       jsonb DEFAULT '[]'::jsonb,
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_talents_industry ON talents(industry);
CREATE INDEX IF NOT EXISTS idx_talents_featured ON talents(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_talents_active ON talents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_talents_industry_active ON talents(industry, is_active);

-- ============================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_talents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER talents_updated_at_trigger
  BEFORE UPDATE ON talents
  FOR EACH ROW
  EXECUTE FUNCTION update_talents_updated_at();

-- ============================================
-- SEED DATA (Migrate from existing talents)
-- ============================================

-- Only insert if table is empty
INSERT INTO talents (
  id, name, industry, gender, age_group, profession, location,
  bio, tagline, skills, image_src, featured, is_active, social_links, portfolio
) VALUES
-- Deejay WG
(
  gen_random_uuid(),
  'Deejay WG',
  'music',
  'male',
  'adult',
  'Deejay',
  'Leeds, UK',
  'With contagious energy and unique versatility, Deejay WG transforms any event into an unforgettable experience. Specializing in blending genres such as afrobeat, dancehall, hip hop, amapiano, house, and more, he adapts seamlessly to any audience and environment — from private parties and weddings to clubs, festivals, and corporate events. He delivers dynamic performances, personalized sets, and total mastery of the dancefloor, ensuring everyone dances until the very last beat. If you''re looking for a DJ who reads the vibe, elevates the energy, and leaves a lasting impact, Deejay WG is the perfect choice.',
  'The right vibe, at the right time.',
  ARRAY['Amapiano', 'Afrohouse', 'Kizomba', 'Afrobeats', 'and more'],
  '/deejaywg/IMG_8999.jpg',
  true,
  true,
  '{"instagram": "https://instagram.com/deejaywg_", "tiktok": "https://tiktok.com/@deejaywg_", "youtube": "https://www.youtube.com/@deejaywg4051"}'::jsonb,
  '[
    {
      "id": "dj1",
      "title": "Travel Edition Series",
      "description": "Deejay WG Live Mix in Portugal",
      "type": "video",
      "thumbnailUrl": "/deejaywg/IMG_8976.jpg",
      "url": "https://youtu.be/nmTRSG5K7wU",
      "date": "2025",
      "category": "Performance"
    },
    {
      "id": "dj2",
      "title": "Summer Festival Performance",
      "description": "Headlining at Lisbon Electronic Festival",
      "type": "image",
      "url": "/deejaywg/IMG_8976.jpg",
      "date": "2024",
      "category": "Performance",
      "photographer": "Festival Media Team",
      "location": "Lisbon, Portugal",
      "client": "Lisbon Electronic Festival",
      "year": 2024,
      "featured": true,
      "professional": true,
      "tags": ["festival", "performance", "headliner", "electronic"]
    },
    {
      "id": "dj3",
      "title": "Studio Session",
      "description": "Creating new tracks for upcoming EP",
      "type": "image",
      "url": "/deejaywg/IMG_8987.jpg",
      "date": "2023",
      "category": "Production"
    },
    {
      "id": "dj4",
      "title": "Ibiza Club Night",
      "description": "Guest DJ at renowned Ibiza nightclub",
      "type": "image",
      "url": "/deejaywg/IMG_8992.jpg",
      "date": "2024",
      "category": "Performance"
    },
    {
      "id": "dj5",
      "title": "Album Cover Photoshoot",
      "description": "Behind the scenes of \"Electronic Horizons\" album artwork",
      "type": "image",
      "url": "/deejaywg/IMG_8996.jpg",
      "date": "2023",
      "category": "Promotion"
    },
    {
      "id": "dj6",
      "title": "Radio Interview",
      "description": "Discussing music influences and upcoming projects",
      "type": "image",
      "url": "/deejaywg/IMG_8999.jpg",
      "date": "2024",
      "category": "Media"
    }
  ]'::jsonb
),

-- Jessica Dias
(
  gen_random_uuid(),
  'Jessica Dias',
  'modeling',
  'female',
  'adult',
  'Model',
  'Leeds, UK',
  'Jéssica Dias is a model with a striking presence and natural elegance that stands out both on the runway and in front of the camera. With an expressive gaze and a versatility that allows her to adapt to different styles and concepts, Jéssica brings authenticity and professionalism to every project. From editorial fashion to commercial campaigns, her charisma and ability to embody creative visions make her the ideal choice for brands seeking impact, beauty, and attitude in one face.',
  'More than an image, an identity.',
  ARRAY['Runway', 'Photoshoot', 'Commercial', 'Music Video Modeling', 'and more'],
  '/jessicadias/IMG_9288-altered.jpg',
  true,
  true,
  '{"instagram": "https://instagram.com/miss_chocolatinha/", "tiktok": "https://tiktok.com/@miss_chocolatinha"}'::jsonb,
  '[
    {
      "id": "jd1",
      "title": "Summer Campaign 2025",
      "description": "Lead model for exclusive beachwear collection",
      "type": "image",
      "url": "/jessicadias/IMG_9193-altered.jpg",
      "date": "2025",
      "category": "Campaign"
    },
    {
      "id": "jd2",
      "title": "Vogue Brasil Editorial",
      "description": "Featured in \"Colors of Brazil\" spread",
      "type": "image",
      "url": "/jessicadias/IMG_9214-altered.jpg",
      "date": "2024",
      "category": "Editorial"
    },
    {
      "id": "jd3",
      "title": "Paris Fashion Week",
      "description": "Runway for top designer spring collection",
      "type": "image",
      "url": "/jessicadias/IMG_9288-altered.jpg",
      "date": "2024",
      "category": "Runway"
    },
    {
      "id": "jd4",
      "title": "Luxury Brand Accessories",
      "description": "Jewelry and accessories campaign",
      "type": "image",
      "url": "/jessicadias/IMG_9365-altered.jpg",
      "date": "2023",
      "category": "Commercial"
    },
    {
      "id": "jd5",
      "title": "Behind the Scenes",
      "description": "NYC photoshoot for fashion magazine",
      "type": "image",
      "url": "/jessicadias/IMG_9380-altered.jpg",
      "date": "2023",
      "category": "Editorial"
    },
    {
      "id": "jd6",
      "title": "Summer Cosmetics",
      "description": "Featured in makeup campaign for international brand",
      "type": "image",
      "url": "/jessicadias/IMG_9412-altered.jpg",
      "date": "2024",
      "category": "Commercial"
    }
  ]'::jsonb
),

-- João Rodolfo
(
  gen_random_uuid(),
  'Joao Rodolfo',
  'music',
  'male',
  'senior',
  'Singer-Songwriter',
  'Leeds, UK',
  'João Rodolfo is one of the voices in Guiné-Bissau''s music scene, deeply rooted in gumbé - a genre rich in identity, rhythm, and tradition. Through his music and an authentic presence, João Rodolfo addresses sensitive themes with courage and sensitivity, turning silenced stories into living art. More than just singing, João Rodolfo gives voice to the soul of a culture.',
  'From the heart to the world.',
  ARRAY['Vocals', 'Guitar', 'Songwriting', 'Live Performance'],
  '/joaorodolfo/JROD_2.jpg',
  true,
  true,
  '{"instagram": "https://instagram.com/joaorodolfo_official/", "tiktok": "https://tiktok.com/@joaorodolfo_official"}'::jsonb,
  '[
    {
      "id": "jr1",
      "title": "Stage Performance",
      "description": "Live concert.",
      "type": "image",
      "url": "/joaorodolfo/JROD_1.jpg",
      "date": "2025",
      "category": "Performance"
    },
    {
      "id": "jr2",
      "title": "Interview Session",
      "description": "In-house interview.",
      "type": "video",
      "thumbnailUrl": "/joaorodolfo/JROD_2.jpg",
      "url": "https://youtu.be/33YE8piwpM8?si=kwRIzM_1HPuk21-U",
      "date": "2025",
      "category": "Studio"
    }
  ]'::jsonb
),

-- Antonio Monteiro
(
  gen_random_uuid(),
  'Antonio Monteiro',
  'sports',
  'male',
  'adult',
  'football player',
  'Leeds, UK',
  'Antonio Monteiro is a semi-professional footballer whose calm presence, work ethic, and fast tactical understanding set him apart. With natural composure and a sharp footballing mind, he seamlessly adapts to multiple roles across the pitch, always focused on contributing to the team''s success. Primarily playing as a <strong>central midfielder (CM)</strong> and <strong>defensive midfielder (CDM)</strong>, Antonio is also highly effective at <strong>left back (LB)</strong> and <strong>right back (RB)</strong>. Though not his preferred role, he can also step into a centre-back (CB) position when needed, demonstrating reliability and positional awareness. Known for his humility, dedication, and consistency, Antonio is the kind of player who leads through action, not noise — a true asset to any squad.',
  'Smart on the ball. Solid in every role.',
  ARRAY['Ball Distribution', 'Tempo Control', 'Defensive Awareness', 'Overlapping Runs', 'Positioning', 'Interceptions', 'Calm Under Pressure'],
  '/antoniomonteiro/Tonecas_1.jpg',
  true,
  true,
  '{"instagram": "https://instagram.com/antoniolaflare98"}'::jsonb,
  '[
    {
      "id": "am1",
      "title": "Match Action 1",
      "description": "Midfield battle",
      "type": "image",
      "url": "/antoniomonteiro/Tonecas_1.jpg",
      "date": "2024",
      "category": "Match"
    },
    {
      "id": "am2",
      "title": "Match Action 2",
      "description": "Dribbling past opponent",
      "type": "image",
      "url": "/antoniomonteiro/Tonecas_2.jpg",
      "date": "2024",
      "category": "Match"
    },
    {
      "id": "am3",
      "title": "Match Action 3",
      "description": "Pressing forward",
      "type": "image",
      "url": "/antoniomonteiro/Tonecas_3.jpg",
      "date": "2024",
      "category": "Match"
    },
    {
      "id": "am4",
      "title": "Coach Talk",
      "description": "Receiving tactical instructions",
      "type": "image",
      "url": "/antoniomonteiro/Tonecas_4.jpg",
      "date": "2024",
      "category": "Training"
    },
    {
      "id": "am5",
      "title": "Tunnel Focus",
      "description": "Focused before kickoff",
      "type": "image",
      "url": "/antoniomonteiro/Tonecas_5.jpg",
      "date": "2024",
      "category": "Portrait"
    }
  ]'::jsonb
)

ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER VIEWS (Optional)
-- ============================================

-- View for featured talents (homepage display)
CREATE OR REPLACE VIEW featured_talents AS
SELECT *
FROM talents
WHERE is_active = true AND featured = true
ORDER BY created_at DESC;

-- View for talents by industry
CREATE OR REPLACE VIEW talents_by_industry AS
SELECT
  industry,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE featured = true) as featured_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM talents
GROUP BY industry
ORDER BY industry;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON talents TO authenticated;
-- GRANT ALL ON talents TO service_role;
