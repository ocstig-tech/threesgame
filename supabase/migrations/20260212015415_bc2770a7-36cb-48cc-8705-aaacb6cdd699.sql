
ALTER TABLE public.player_accounts 
ADD COLUMN security_color text,
ADD COLUMN failed_reset_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
