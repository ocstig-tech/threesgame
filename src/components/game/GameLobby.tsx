import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Play, Dice1 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "./PlayerCard";

import type { PublicPlayer } from "@/hooks/useGame";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];

interface GameLobbyProps {
  game: Game;
  players: PublicPlayer[];
  myPlayer: PublicPlayer | null;
  isHost: boolean;
  onStartRollOff: () => void;
  onRollForTurn: () => void;
  onStartGame: () => void;
}

export function GameLobby({
  game,
  players,
  myPlayer,
  isHost,
  onStartRollOff,
  onRollForTurn,
  onStartGame,
}: GameLobbyProps) {
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownStartedRef = useRef(false);
  
  const isRollOff = game.status === "roll_off";
  const isTieBreaker = game.status === "tie_breaker";
  
  // In tie-breaker, only players without a roll need to roll
  const playersNeedingRoll = isTieBreaker
    ? players.filter((p) => p.roll_off_value === null)
    : players;
  
  const allRolled = playersNeedingRoll.every((p) => p.roll_off_value !== null);
  const hasRolled = myPlayer?.roll_off_value !== null;
  const needsToRoll = isTieBreaker 
    ? myPlayer?.roll_off_value === null 
    : !hasRolled;

  // 5-second countdown after all players have rolled
  useEffect(() => {
    if (allRolled && (isRollOff || isTieBreaker) && !countdownStartedRef.current) {
      countdownStartedRef.current = true;
      setCountdown(5);
    }
  }, [allRolled, isRollOff, isTieBreaker]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  // Reset countdown when entering new roll-off/tie-breaker
  useEffect(() => {
    if (!allRolled) {
      countdownStartedRef.current = false;
      setCountdown(null);
    }
  }, [allRolled]);

  const canStartGame = allRolled && countdown === 0;
  

  return (
    <div className="min-h-screen bg-felt p-4 md:p-8 relative" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
            {isTieBreaker ? "Tie Breaker!" : "Game Lobby"}
          </h1>
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {players.length} Players
            </span>
            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full font-semibold">
              {game.bet_amount} points
            </span>
          </div>
        </div>

        {/* Room Code & Share */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 mb-6 text-center card-glow"
        >
          <p className="text-sm text-muted-foreground mb-2">Room Code</p>
          <p className="text-4xl md:text-5xl font-mono font-bold text-primary tracking-widest mb-4">
            {game.room_code}
          </p>
          
        </motion.div>

        {/* Instructions */}
        {!isRollOff && !isTieBreaker && (
          <div className="bg-secondary/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-foreground">
              {isHost
                ? players.length < 2
                  ? "Waiting for more players to join..."
                  : "When everyone's ready, start the roll-off to determine turn order!"
                : "Waiting for the host to start the game..."}
            </p>
          </div>
        )}

        {isRollOff && !allRolled && (
          <div className="bg-primary/20 rounded-xl p-4 mb-6 text-center">
            <Dice1 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-foreground font-medium">Roll-Off Phase</p>
            <p className="text-sm text-muted-foreground">
              Everyone rolls one die. Highest roll goes first!
            </p>
          </div>
        )}

        {isTieBreaker && !allRolled && (
          <div className="bg-destructive/20 rounded-xl p-4 mb-6 text-center">
            <Dice1 className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-foreground font-medium">Tie Breaker!</p>
            <p className="text-sm text-muted-foreground">
              Tied players must roll again to determine who goes first.
            </p>
          </div>
        )}

        {allRolled && (isRollOff || isTieBreaker) && (
          <div className="bg-primary/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-foreground font-medium">All Rolls Complete!</p>
            {countdown !== null && countdown > 0 ? (
              <p className="text-2xl font-bold text-primary mt-2">
                Starting in {countdown}...
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isHost ? "Ready to start!" : "Waiting for host to start..."}
              </p>
            )}
          </div>
        )}

        {/* Players List */}
        <div className="space-y-3 mb-8">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              name={player.name}
              isMe={player.id === myPlayer?.id}
              rollOffValue={player.roll_off_value}
              totalEarnings={player.total_earnings}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {(isRollOff || isTieBreaker) && needsToRoll && (
            <Button
              onClick={onRollForTurn}
              size="lg"
              className="w-full gold-glow"
            >
              <Dice1 className="w-5 h-5 mr-2" />
              Roll for Turn Order
            </Button>
          )}

          {(isRollOff || isTieBreaker) && canStartGame && isHost && (
            <Button
              onClick={onStartGame}
              size="lg"
              className="w-full gold-glow"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          )}

          {!isRollOff && !isTieBreaker && isHost && players.length >= 2 && (
            <Button
              onClick={onStartRollOff}
              size="lg"
              className="w-full gold-glow"
            >
              <Dice1 className="w-5 h-5 mr-2" />
              Start Roll-Off
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
