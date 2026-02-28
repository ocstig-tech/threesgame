-- Create a public view that excludes sensitive columns
CREATE VIEW public.players_public
WITH (security_invoker = on) AS
  SELECT id, game_id, name, status, is_active, current_score, kept_dice, 
         rolls_remaining, roll_off_value, turn_order, total_earnings, created_at
  FROM public.players;

-- Drop the existing permissive SELECT policy on players
DROP POLICY IF EXISTS "Players are readable " ON public.players;

-- Deny direct SELECT on the base table (edge functions bypass via service role)
CREATE POLICY "No direct access to players base table"
  ON public.players FOR SELECT
  USING (false);

-- Allow reading the view
GRANT SELECT ON public.players_public TO anon, authenticated;