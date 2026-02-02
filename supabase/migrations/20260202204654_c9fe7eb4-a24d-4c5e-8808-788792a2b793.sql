-- Add optional phone number to players for identity and payment facilitation
ALTER TABLE public.players
ADD COLUMN phone_number text;