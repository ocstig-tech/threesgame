
-- Create player accounts table
CREATE TABLE public.player_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_accounts ENABLE ROW LEVEL SECURITY;

-- Anyone can read accounts (needed for login check)
CREATE POLICY "Accounts are readable" 
  ON public.player_accounts FOR SELECT 
  USING (true);

-- Only server (edge functions) can insert/update via service role
-- No public insert/update/delete policies = blocked for anon

-- Add account_id to players table to link players to accounts
ALTER TABLE public.players ADD COLUMN account_id UUID REFERENCES public.player_accounts(id);

-- Enable realtime for player_accounts
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_accounts;
