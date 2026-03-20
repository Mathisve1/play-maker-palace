-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Canteen Tegoed (€ Euro Wallet) — replaces free drink tokens + coffee
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. club_reward_settings: add canteen Euro reward config
ALTER TABLE public.club_reward_settings
  ADD COLUMN IF NOT EXISTS canteen_enabled        BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canteen_reward_eur     NUMERIC(6,2)  NOT NULL DEFAULT 2.50;

-- 2. volunteer_rewards: add canteen Euro balance per volunteer per club
ALTER TABLE public.volunteer_rewards
  ADD COLUMN IF NOT EXISTS canteen_balance_eur    NUMERIC(8,2)  NOT NULL DEFAULT 0;

-- 3. RPC: atomically deduct an amount from canteen_balance_eur
--    Returns the new balance, or NULL if balance was insufficient / row missing.
CREATE OR REPLACE FUNCTION public.consume_canteen_balance(
  p_user_id  UUID,
  p_club_id  UUID,
  p_amount   NUMERIC DEFAULT 0.01
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE volunteer_rewards
    SET canteen_balance_eur = canteen_balance_eur - p_amount
  WHERE user_id  = p_user_id
    AND club_id  = p_club_id
    AND canteen_balance_eur >= p_amount
  RETURNING canteen_balance_eur INTO v_new_balance;

  RETURN v_new_balance; -- NULL when balance insufficient or row missing
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_canteen_balance(UUID, UUID, NUMERIC)
  TO anon, authenticated;

-- 4. RPC: credit canteen balance (called after a shift is checked-in)
CREATE OR REPLACE FUNCTION public.credit_canteen_balance(
  p_user_id  UUID,
  p_club_id  UUID,
  p_amount   NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO volunteer_rewards (user_id, club_id, canteen_balance_eur)
    VALUES (p_user_id, p_club_id, p_amount)
  ON CONFLICT (user_id, club_id)
    DO UPDATE SET canteen_balance_eur = volunteer_rewards.canteen_balance_eur + EXCLUDED.canteen_balance_eur;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_canteen_balance(UUID, UUID, NUMERIC)
  TO anon, authenticated;
