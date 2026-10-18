-- 033: CRM meetings with AI-drafted notes (CRM plan phase 3b)
--
-- A meeting can be linked to a deal, a client and talents. Visibility follows
-- the CRM rules (enforced in the app): admins see everything; managers see
-- meetings they created, or that are on a deal or client they can see, or
-- that involve a talent assigned to them.
--
-- Notes: the person pastes a transcript and confirms everyone was told the
-- call was recorded. Claude drafts a summary, decisions and action items
-- (ai_status pending -> ready / failed); the person edits and saves them.
-- Action items can become CRM tasks (activities); task_activity_id on each
-- item stops the same item being turned into a task twice.

BEGIN;

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  talent_ids uuid[] NOT NULL DEFAULT '{}',
  attendees text,

  -- Transcript and the recording notice
  transcript text,
  transcript_consent_at timestamptz,
  transcript_consent_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Notes (drafted by Claude, then edited by a person)
  summary text,
  decisions jsonb NOT NULL DEFAULT '[]',     -- ["...", ...]
  action_items jsonb NOT NULL DEFAULT '[]',  -- [{ id, title, owner_name, owner_user_id, due_date, task_activity_id }]
  notes_reviewed_at timestamptz,
  notes_reviewed_by_name text,

  -- Drafting job
  ai_status text NOT NULL DEFAULT 'none' CHECK (ai_status IN ('none', 'pending', 'ready', 'failed')),
  ai_job_token text,                         -- one-off token the background job must present
  ai_requested_at timestamptz,
  ai_generated_at timestamptz,
  ai_model text,
  ai_error text,

  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_starts ON meetings (starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_deal ON meetings (deal_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON meetings (organisation_id);
CREATE INDEX IF NOT EXISTS idx_meetings_talents ON meetings USING gin (talent_ids);

COMMIT;
