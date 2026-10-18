-- 036: prospecting campaigns (CRM plan phase 4, "outreach v1") and KPIs (phase 5)
--
-- Prospecting is task-driven: nothing is sent by the system. Each active
-- enrolment has a next step and a due date; the person sends the filled-in
-- message from their own mailbox, LinkedIn or phone and records the result.
-- (Member outreach from the loyalty programme is separate: outreach_log.)
--
-- Compliance (UK GDPR / PECR): do_not_contact contacts are never listed and
-- their enrolments stop; sole traders count as individuals, so email steps
-- need lawful_basis = 'consent'; every email carries an opt-out line (added
-- by the app).
--
-- KPIs: targets per metric per month (agency-wide), and a nightly snapshot
-- of each month's values so trends survive later edits to old records.

BEGIN;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_sole_trader boolean NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram text;

CREATE TABLE IF NOT EXISTS prospect_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'done')),
  talent_ids uuid[] NOT NULL DEFAULT '{}',
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name text,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospect_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES prospect_campaigns(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  delay_days integer NOT NULL DEFAULT 0 CHECK (delay_days BETWEEN 0 AND 365),
  channel text NOT NULL CHECK (channel IN ('email', 'linkedin', 'call', 'instagram')),
  subject text,
  body text NOT NULL,
  UNIQUE (campaign_id, position)
);

CREATE TABLE IF NOT EXISTS prospect_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES prospect_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  next_step integer NOT NULL DEFAULT 1,
  next_due_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'replied', 'meeting', 'not_interested', 'bounced', 'unsubscribed', 'completed', 'stopped'
  )),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  first_contacted_at timestamptz,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_prospect_enrolments_due ON prospect_enrolments (status, next_due_at);
CREATE INDEX IF NOT EXISTS idx_prospect_enrolments_owner ON prospect_enrolments (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_enrolments_contact ON prospect_enrolments (contact_id);

CREATE TABLE IF NOT EXISTS prospect_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES prospect_enrolments(id) ON DELETE CASCADE,
  step_position integer NOT NULL,
  channel text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('sent', 'skipped')),
  note text,
  done_by uuid REFERENCES users(id) ON DELETE SET NULL,
  done_by_name text,
  done_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prospect_touches_enrolment ON prospect_touches (enrolment_id);
CREATE INDEX IF NOT EXISTS idx_prospect_touches_done ON prospect_touches (done_at);

CREATE TABLE IF NOT EXISTS kpi_targets (
  metric text NOT NULL,
  month date NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  target numeric NOT NULL,
  set_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric, month)
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  metric text NOT NULL,
  month date NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  value numeric,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric, month)
);

COMMIT;
