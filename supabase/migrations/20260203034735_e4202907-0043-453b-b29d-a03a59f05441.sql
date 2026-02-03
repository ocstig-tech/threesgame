-- Add a between-rounds state to pause after each completed round
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'game_status'
      AND n.nspname = 'public'
      AND e.enumlabel = 'between_rounds'
  ) THEN
    ALTER TYPE public.game_status ADD VALUE 'between_rounds';
  END IF;
END $$;