import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatChips } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Player = Database["public"]["Tables"]["players"]["Row"];
type GameRound = Database["public"]["Tables"]["game_rounds"]["Row"];

interface SettlementProps {
  players: Player[];
  rounds: GameRound[];
  betAmount: number;
  onNewGame: () => void;
  onGoHome: () => void;
}

export function Settlement({
  players,
  rounds,
  betAmount,
  onNewGame,
  onGoHome,
}: SettlementProps) {
  // Sort players by earnings (highest first)
  const sortedPlayers = [...players].sort(
    (a, b) => (b.total_earnings || 0) - (a.total_earnings || 0)
  );

  const biggestWinner = sortedPlayers[0];
  const biggestLoser = sortedPlayers[sortedPlayers.length - 1];

  return (
    <div className="min-h-screen bg-felt p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center"
          >
            <Trophy className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
            Game Over!
          </h1>
          <p className="text-muted-foreground">
            {rounds.length} rounds played • {betAmount} chips per round
          </p>
        </div>

        {/* Winner Highlight */}
        {biggestWinner && biggestWinner.total_earnings > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-6 mb-6 text-center winner-glow"
          >
            <p className="text-sm text-emerald-400 mb-1">Biggest Winner</p>
            <p className="text-2xl font-bold text-foreground">
              {biggestWinner.name}
            </p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">
              {formatChips(biggestWinner.total_earnings)} chips
            </p>
          </motion.div>
        )}

        {/* All Players */}
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden card-glow mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Settlement</h2>
          </div>
          <div className="divide-y divide-border">
            {sortedPlayers.map((player, index) => {
              const earnings = player.total_earnings || 0;
              const isWinner = earnings > 0;
              const isLoser = earnings < 0;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 && earnings > 0 && "bg-primary text-primary-foreground",
                        index !== 0 && "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground">
                      {player.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isWinner && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {isLoser && <TrendingDown className="w-4 h-4 text-red-400" />}
                    {!isWinner && !isLoser && <Minus className="w-4 h-4 text-muted-foreground" />}
                    <span
                      className={cn(
                        "font-bold text-lg",
                        isWinner && "text-emerald-400",
                        isLoser && "text-red-400",
                        !isWinner && !isLoser && "text-muted-foreground"
                      )}
                    >
                      {formatChips(earnings)} chips
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-secondary/30 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-foreground mb-2">To Settle Up:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {sortedPlayers
              .filter((p) => (p.total_earnings || 0) < 0)
              .map((loser) => {
                const owes = Math.abs(loser.total_earnings || 0);
                return (
                  <li key={loser.id}>
                    <span className="text-foreground">{loser.name}</span> owes{" "}
                    <span className="text-primary font-medium">{owes} chips</span>
                  </li>
                );
              })}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onNewGame}
            size="lg"
            className="flex-1 gold-glow"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            New Game
          </Button>
          <Button
            onClick={onGoHome}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
