-- Deny all direct client access to player_accounts
-- Edge functions use service_role key which bypasses RLS
CREATE POLICY "No direct access to player_accounts"
  ON public.player_accounts FOR SELECT
  USING (false);

CREATE POLICY "No direct insert to player_accounts"
  ON public.player_accounts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update to player_accounts"
  ON public.player_accounts FOR UPDATE
  USING (false);

CREATE POLICY "No direct delete to player_accounts"
  ON public.player_accounts FOR DELETE
  USING (false);