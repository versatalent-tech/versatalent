-- 034: private documents on bookings, deals and talent profiles (CRM plan phase 2b)
--
-- Files live in a private Netlify Blobs store ("documents") under blob_key
-- and are only ever served by /api/documents/[id], which checks access:
--   admin: everything
--   manager: documents on bookings and profiles of their assigned talents,
--            and on deals they can see; never admin-only documents
--   road manager: riders and briefs of their assigned talents
--   talent: documents on their own bookings and profile switched to visible_to_talent
-- A comp card on a talent's profile can be made the public press kit
-- (is_public), downloadable by anyone from the talent's public page.
-- ID / right-to-work documents are always admin-only (UK GDPR) and carry a
-- delete_after date. Insurance and ID documents can carry an expiry date.
-- Deleting a booking, deal or talent deletes its documents (the app removes
-- the files first).

BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  talent_id uuid REFERENCES talents(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN (
    'contract', 'rider', 'brief', 'invoice', 'agreement', 'comp_card', 'insurance', 'id_document', 'other'
  )),
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  blob_key text NOT NULL UNIQUE,
  visible_to_talent boolean NOT NULL DEFAULT false,
  admin_only boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  expires_on date,
  delete_after date,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(booking_id, deal_id, talent_id) = 1),
  CHECK (deal_id IS NULL OR visible_to_talent = false),
  CHECK (kind <> 'id_document' OR admin_only),
  CHECK (NOT is_public OR (talent_id IS NOT NULL AND kind = 'comp_card' AND NOT admin_only))
);

CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents (deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_talent ON documents (talent_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents (expires_on) WHERE expires_on IS NOT NULL;

COMMIT;
