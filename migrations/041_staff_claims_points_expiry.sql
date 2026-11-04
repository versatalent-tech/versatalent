-- 041: staff-confirmed reward claims, and reward points that expire
--
-- 1. Claims. The member pass opens from a card's link, which anyone can copy,
--    so a member can no longer spend points from it. They *request* a reward
--    there (no points taken; event places are held). Staff tap the member's
--    card and confirm it, and only then are the points taken. Staff can also
--    give a reward on the spot, as before. Old 'reserved' claims still work.
--
-- 2. Expiry. Reward points (not status points) expire after a number of
--    months with no points earned or spent. Off until a number is set
--    (programme_settings.reward_expiry_months, 0 = never). Each expiry is a
--    ledger entry keyed to the member's last activity, so it happens once.

ALTER TABLE reward_claims DROP CONSTRAINT IF EXISTS reward_claims_status_check;
ALTER TABLE reward_claims ADD CONSTRAINT reward_claims_status_check
  CHECK (status IN ('requested', 'reserved', 'redeemed', 'cancelled', 'expired'));
-- What a request will cost when confirmed (the price when it was asked for)
ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS points_due integer NOT NULL DEFAULT 0 CHECK (points_due >= 0);
UPDATE reward_claims SET points_due = points_held WHERE points_due = 0 AND points_held > 0;
DROP INDEX IF EXISTS idx_reward_claims_expiry;
CREATE INDEX IF NOT EXISTS idx_reward_claims_expiry ON reward_claims (expires_at) WHERE status IN ('requested', 'reserved');

DROP FUNCTION IF EXISTS reward_claim(uuid, uuid, uuid, text, text, uuid, boolean);

-- Claim a reward. p_mode: 'request' (the member, from their pass: no points
-- taken yet) or 'redeem' (staff, with the member there: points taken, used now).
-- Every rule is checked in one step. Errors (P0001) are written for the member.
CREATE OR REPLACE FUNCTION reward_claim(
  p_reward uuid, p_user uuid, p_event uuid, p_guest_name text, p_code text, p_actor uuid, p_mode text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  r rewards%ROWTYPE;
  m vip_memberships%ROWTYPE;
  ev record;
  claim_id uuid := gen_random_uuid();
  uk_today date := (NOW() AT TIME ZONE 'Europe/London')::date;
  founding_start timestamptz;
  dob date;
  since timestamptz;
  used integer;
  expires timestamptz;
  tier_rank integer;
BEGIN
  IF p_mode NOT IN ('request', 'redeem') THEN
    RAISE EXCEPTION 'Unknown claim mode %', p_mode;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM programme_settings WHERE key = 'rewards_open' AND value = 'true'::jsonb) THEN
    RAISE EXCEPTION 'Rewards aren''t open at the moment.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO r FROM rewards WHERE id = p_reward FOR UPDATE;
  IF NOT FOUND OR NOT r.is_active OR (r.valid_from IS NOT NULL AND uk_today < r.valid_from)
     OR (r.valid_until IS NOT NULL AND uk_today > r.valid_until) THEN
    RAISE EXCEPTION 'This reward isn''t available.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO m FROM vip_memberships WHERE user_id = p_user;
  IF NOT FOUND OR m.status <> 'active' THEN
    RAISE EXCEPTION 'You need an active membership to claim rewards.' USING ERRCODE = 'P0001';
  END IF;

  IF r.min_tier IS NOT NULL THEN
    -- (CASE can't sit inside an IF condition in PL/pgSQL: its THEN ends the condition)
    tier_rank := array_position(ARRAY['silver', 'gold', 'black'], m.tier);
    IF tier_rank < array_position(ARRAY['silver', 'gold', 'black'], r.min_tier) THEN
      RAISE EXCEPTION 'This reward is for % members and above.', initcap(r.min_tier) USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT starts_at INTO founding_start FROM paid_memberships
  WHERE user_id = p_user AND status = 'active' AND starts_at <= NOW() AND ends_at > NOW()
  ORDER BY starts_at DESC LIMIT 1;
  IF r.founding_only AND founding_start IS NULL THEN
    RAISE EXCEPTION 'This reward is for V•PRIVILEGE Founding Members.' USING ERRCODE = 'P0001';
  END IF;

  IF r.birthday_month_only THEN
    SELECT date_of_birth INTO dob FROM vip_profiles WHERE user_id = p_user;
    IF dob IS NULL OR EXTRACT(MONTH FROM dob) <> EXTRACT(MONTH FROM uk_today) THEN
      RAISE EXCEPTION 'This reward is available in your birthday month.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.stock IS NOT NULL THEN
    SELECT COUNT(*) INTO used FROM reward_claims WHERE reward_id = r.id AND status IN ('requested', 'reserved', 'redeemed');
    IF used >= r.stock THEN
      RAISE EXCEPTION 'This reward has run out.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.per_member_limit IS NOT NULL THEN
    since := CASE
      WHEN r.limit_period = 'ever' THEN '-infinity'::timestamptz
      WHEN r.founding_only THEN founding_start
      ELSE (m.year_start::timestamp AT TIME ZONE 'Europe/London')
    END;
    SELECT COUNT(*) INTO used FROM reward_claims
    WHERE reward_id = r.id AND user_id = p_user AND status IN ('requested', 'reserved', 'redeemed') AND created_at >= since;
    IF used >= r.per_member_limit THEN
      RAISE EXCEPTION 'You''ve already claimed this reward%.',
        CASE WHEN r.limit_period = 'year' THEN ' as many times as you can this year' ELSE '' END USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF r.requires_event THEN
    IF p_event IS NULL THEN
      RAISE EXCEPTION 'Choose the event.' USING ERRCODE = 'P0001';
    END IF;
    SELECT id, title, start_time INTO ev FROM events WHERE id = p_event AND COALESCE(is_published, true);
    IF NOT FOUND OR ev.start_time < NOW() - INTERVAL '12 hours' THEN
      RAISE EXCEPTION 'That event isn''t available.' USING ERRCODE = 'P0001';
    END IF;
    IF r.event_ids IS NOT NULL AND NOT (p_event = ANY (r.event_ids)) THEN
      RAISE EXCEPTION 'This reward can''t be used at that event.' USING ERRCODE = 'P0001';
    END IF;
    IF r.book_hours_before > 0 AND ev.start_time - NOW() < make_interval(hours => r.book_hours_before) THEN
      RAISE EXCEPTION 'Claim this at least % hours before the event.', r.book_hours_before USING ERRCODE = 'P0001';
    END IF;
    SELECT COUNT(*) INTO used FROM reward_claims
    WHERE reward_id = r.id AND event_id = p_event AND user_id = p_user AND status IN ('requested', 'reserved', 'redeemed');
    IF used > 0 THEN
      RAISE EXCEPTION 'You''ve already claimed this for that event.' USING ERRCODE = 'P0001';
    END IF;
    IF r.per_event_cap IS NOT NULL THEN
      SELECT COUNT(*) INTO used FROM reward_claims WHERE reward_id = r.id AND event_id = p_event AND status IN ('requested', 'reserved', 'redeemed');
      IF used >= r.per_event_cap THEN
        RAISE EXCEPTION 'No places left for that event.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    expires := ev.start_time + INTERVAL '1 day';
  ELSE
    expires := NOW() + make_interval(days => r.claim_valid_days);
  END IF;

  IF r.needs_guest_name AND COALESCE(btrim(p_guest_name), '') = '' THEN
    RAISE EXCEPTION 'Enter your guest''s name.' USING ERRCODE = 'P0001';
  END IF;

  IF r.point_cost > 0 THEN
    IF m.points_balance < r.point_cost THEN
      RAISE EXCEPTION 'You need % points for this (you have %).', r.point_cost, m.points_balance USING ERRCODE = 'P0001';
    END IF;
  END IF;
  -- A request takes no points: they're taken when staff confirm it with the card
  IF r.point_cost > 0 AND p_mode = 'redeem' THEN
    PERFORM loyalty_post(p_user, 'reward', -r.point_cost, 'reward_claim', 'claim:' || claim_id, claim_id,
                         jsonb_build_object('reward', r.title), p_actor, 'strict');
  END IF;

  INSERT INTO reward_claims (id, reward_id, user_id, status, code, reward_title, points_held, points_due, unit_cost_cents,
                             event_id, guest_name, expires_at, redeemed_at, redeemed_by, created_by)
  VALUES (claim_id, r.id, p_user, CASE WHEN p_mode = 'redeem' THEN 'redeemed' ELSE 'requested' END, p_code, r.title,
          CASE WHEN p_mode = 'redeem' THEN r.point_cost ELSE 0 END, r.point_cost, r.unit_cost_cents,
          CASE WHEN r.requires_event THEN p_event END,
          CASE WHEN r.needs_guest_name THEN btrim(p_guest_name) END, expires,
          CASE WHEN p_mode = 'redeem' THEN NOW() END, CASE WHEN p_mode = 'redeem' THEN p_actor END,
          CASE WHEN p_mode = 'redeem' THEN p_actor END);
  RETURN claim_id;
END;
$$;

-- Close an open claim: redeemed (used), cancelled or expired. A request's
-- points are taken when it's redeemed; a reserved claim's held points go back
-- when it's cancelled or expires. Returns the claim's new status.
CREATE OR REPLACE FUNCTION reward_claim_close(p_claim uuid, p_status text, p_actor uuid, p_reason text)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  c reward_claims%ROWTYPE;
  ev_start timestamptz;
  ev_title text;
  final text := p_status;
BEGIN
  IF p_status NOT IN ('redeemed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Unknown status %', p_status;
  END IF;

  SELECT * INTO c FROM reward_claims WHERE id = p_claim FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found.' USING ERRCODE = 'P0001';
  END IF;
  IF c.status = 'redeemed' THEN
    RAISE EXCEPTION 'Already used on %.', to_char(c.redeemed_at AT TIME ZONE 'Europe/London', 'FMDD Mon YYYY "at" HH24:MI') USING ERRCODE = 'P0001';
  ELSIF c.status = 'cancelled' THEN
    RAISE EXCEPTION 'This claim was cancelled.' USING ERRCODE = 'P0001';
  ELSIF c.status = 'expired' THEN
    RAISE EXCEPTION 'This claim has expired.' USING ERRCODE = 'P0001';
  END IF;

  IF p_status = 'redeemed' THEN
    IF c.expires_at <= NOW() THEN
      final := 'expired';
    ELSIF c.event_id IS NOT NULL THEN
      SELECT start_time, title INTO ev_start, ev_title FROM events WHERE id = c.event_id;
      IF ev_start IS NOT NULL AND ev_start - INTERVAL '12 hours' > NOW() THEN
        RAISE EXCEPTION 'This is for % on %. It can be used on the day.', ev_title,
          to_char(ev_start AT TIME ZONE 'Europe/London', 'FMDD Mon') USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  IF final = 'redeemed' THEN
    -- A member's request: the points are taken now, with staff and the card in front of them
    IF c.status = 'requested' AND c.points_due > 0 THEN
      PERFORM loyalty_post(c.user_id, 'reward', -c.points_due, 'reward_claim', 'claim:' || c.id, c.id,
                           jsonb_build_object('reward', c.reward_title), p_actor, 'strict');
    END IF;
    UPDATE reward_claims
    SET status = 'redeemed', redeemed_at = NOW(), redeemed_by = p_actor,
        points_held = CASE WHEN c.status = 'requested' THEN c.points_due ELSE points_held END, updated_at = NOW()
    WHERE id = c.id;
  ELSE
    UPDATE reward_claims
    SET status = final, closed_at = NOW(), closed_by = p_actor,
        close_reason = COALESCE(p_reason, CASE WHEN final = 'expired' THEN 'Not used in time' END), updated_at = NOW()
    WHERE id = c.id;
    IF c.points_held > 0 THEN
      PERFORM loyalty_post(c.user_id, 'reward', c.points_held, 'reward_release', 'claim_release:' || c.id, c.id,
                           jsonb_build_object('reward', c.reward_title, 'reason', final), p_actor, 'clamp');
    END IF;
  END IF;
  RETURN final;
END;
$$;

CREATE OR REPLACE FUNCTION reward_expire_claims() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  c record;
  n integer := 0;
BEGIN
  FOR c IN SELECT id FROM reward_claims WHERE status IN ('requested', 'reserved') AND expires_at <= NOW() ORDER BY expires_at LIMIT 500 LOOP
    PERFORM reward_claim_close(c.id, 'expired', NULL, NULL);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Points expiry
-- ---------------------------------------------------------------------------
INSERT INTO programme_settings (key, value) VALUES ('reward_expiry_months', '0')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE vip_points_log DROP CONSTRAINT IF EXISTS vip_points_log_source_check;
ALTER TABLE vip_points_log ADD CONSTRAINT vip_points_log_source_check CHECK (source IN (
  'event_checkin', 'consumption', 'consumption_pos', 'manual_adjust', 'tier_bonus',
  'opening_balance', 'reward_claim', 'reward_release', 'order_refund', 'year_end',
  'ticket_purchase', 'points_expiry'
));
