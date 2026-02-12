
-- 1. Lock down player_accounts: block all client access (edge function uses service role)
DROP POLICY IF EXISTS "Accounts are readable" ON public.player_accounts;
-- No client access needed - all operations go through edge function with service role

-- 2. Lock down games to SELECT only
DROP POLICY IF EXISTS "Games are publicly accessible" ON public.games;
CREATE POLICY "Games are readable" ON public.games FOR SELECT USING (true);

-- 3. Lock down players to SELECT only  
DROP POLICY IF EXISTS "Players are publicly accessible" ON public.players;
CREATE POLICY "Players are readable" ON public.players FOR SELECT USING (true);

-- 4. Lock down game_rounds to SELECT only
DROP POLICY IF EXISTS "Game rounds are publicly accessible" ON public.game_rounds;
CREATE POLICY "Game rounds are readable" ON public.game_rounds FOR SELECT USING (true);
