-- Create enum for game status
CREATE TYPE public.game_status AS ENUM ('waiting', 'roll_off', 'playing', 'tie_breaker', 'finished');

-- Create enum for player status
CREATE TYPE public.player_status AS ENUM ('waiting', 'rolling', 'finished');

-- Games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_name TEXT NOT NULL,
  bet_amount INTEGER NOT NULL DEFAULT 5 CHECK (bet_amount >= 1 AND bet_amount <= 100),
  status game_status NOT NULL DEFAULT 'waiting',
  current_player_id UUID,
  pot INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  roll_off_value INTEGER,
  turn_order INTEGER,
  current_score INTEGER,
  kept_dice INTEGER[] DEFAULT '{}',
  rolls_remaining INTEGER DEFAULT 5,
  status player_status NOT NULL DEFAULT 'waiting',
  total_earnings INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game rounds table to track history
CREATE TABLE public.game_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  winner_id UUID REFERENCES public.players(id),
  was_tie BOOLEAN NOT NULL DEFAULT false,
  pot_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_games_room_code ON public.games(room_code);
CREATE INDEX idx_players_game_id ON public.players(game_id);
CREATE INDEX idx_players_session_id ON public.players(session_id);
CREATE INDEX idx_game_rounds_game_id ON public.game_rounds(game_id);

-- Enable Row Level Security (but allow public access for this game)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

-- Public policies (no auth required for this casual game)
CREATE POLICY "Games are publicly accessible"
  ON public.games FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Players are publicly accessible"
  ON public.players FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Game rounds are publicly accessible"
  ON public.game_rounds FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();