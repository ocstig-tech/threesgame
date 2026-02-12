-- Allow pin_hash to be nullable (needed for host-cleared accounts)
ALTER TABLE public.player_accounts ALTER COLUMN pin_hash DROP NOT NULL;