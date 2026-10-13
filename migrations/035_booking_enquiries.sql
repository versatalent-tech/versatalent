-- 035: booking enquiries from talent pages and card taps
--
-- A prospect can ask about booking a specific talent from the talent's
-- public page (form 'booking'). source says how they got there: a talent
-- tapping their card on the prospect's phone ('card_tap') or the website.
-- marketing_consent is the prospect's own unticked-by-default choice.

BEGIN;

ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_form_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_form_check CHECK (form IN ('contact', 'brand', 'talent', 'booking'));

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES talents(id) ON DELETE SET NULL;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_source_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_source_check CHECK (source IN ('website', 'card_tap'));
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_enquiries_talent ON enquiries (talent_id) WHERE talent_id IS NOT NULL;

COMMIT;
