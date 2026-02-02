import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Play, Dice1, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "./PlayerCard";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"];

interface GameLobbyProps {
  game: Game;
  players: Player[];
  myPlayer: Player | null;
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
  const [copied, setCopied] = useState(false);
  
  const allRolled = players.every((p) => p.roll_off_value !== null);
  const hasRolled = myPlayer?.roll_off_value !== null;
  const isRollOff = game.status === "roll_off";
  const isTieBreaker = game.status === "tie_breaker";
  
  const gameUrl = `${window.location.origin}/game/${game.room_code}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Threes game!",
          text: `Join my Threes dice game! Room code: ${game.room_code}`,
          url: gameUrl,
        });
      } catch (err) {
        // User cancelled or share failed - fallback to copy
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-felt p-4 md:p-8">
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
              ${game.bet_amount} bet
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
          
          {/* Share buttons */}
          <div className="flex flex-col gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Share this link:</p>
              <p className="text-sm font-mono text-foreground break-all">{gameUrl}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1 gold-glow"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
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

        {isTieBreaker && (
          <div className="bg-destructive/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-foreground font-medium">It's a Tie!</p>
            <p className="text-sm text-muted-foreground">
              Everyone adds another ${game.bet_amount} to the pot. Roll off again to determine turn order.
            </p>
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
          {(isRollOff || isTieBreaker) && !hasRolled && (
            <Button
              onClick={onRollForTurn}
              size="lg"
              className="w-full gold-glow"
            >
              <Dice1 className="w-5 h-5 mr-2" />
              Roll for Turn Order
            </Button>
          )}

          {(isRollOff || isTieBreaker) && allRolled && isHost && (
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
