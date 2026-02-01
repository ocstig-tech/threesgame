import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dice1, Check, RotateCcw, Trophy, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiceContainer } from "./Dice";
import { PlayerCard } from "./PlayerCard";
import { rollDice, calculateScore } from "@/lib/gameUtils";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"];

interface GamePlayProps {
  game: Game;
  players: Player[];
  currentPlayer: Player | null;
  myPlayer: Player | null;
  onRollDice: (keptIndices: number[], currentDice: number[]) => Promise<number[] | null>;
  onKeepDice: (keptDice: number[], rollsRemaining: number) => Promise<void>;
  onEndTurn: (finalDice: number[]) => Promise<void>;
  onEndGame: () => Promise<void>;
}

export function GamePlay({
  game,
  players,
  currentPlayer,
  myPlayer,
  onRollDice,
  onKeepDice,
  onEndTurn,
  onEndGame,
}: GamePlayProps) {
  const [dice, setDice] = useState<number[]>([0, 0, 0, 0, 0]);
  const [keptIndices, setKeptIndices] = useState<number[]>([]);
  const [rollsRemaining, setRollsRemaining] = useState(5);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);

  const isMyTurn = currentPlayer?.id === myPlayer?.id;
  const currentScore = calculateScore(dice.filter((_, i) => keptIndices.includes(i)));
  const potentialScore = calculateScore(dice);

  // Reset state when it becomes my turn
  useEffect(() => {
    if (isMyTurn && myPlayer?.status === "rolling") {
      setDice([0, 0, 0, 0, 0]);
      setKeptIndices([]);
      setRollsRemaining(myPlayer.rolls_remaining || 5);
      setHasRolledOnce(false);
    }
  }, [isMyTurn, myPlayer]);

  const handleRoll = async () => {
    if (!isMyTurn || rollsRemaining <= 0 || isRolling) return;

    setIsRolling(true);

    // Simulate roll animation
    const animationDice = [...dice];
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 50));
      setDice(
        animationDice.map((d, idx) =>
          keptIndices.includes(idx) ? d : rollDice(1)[0]
        )
      );
    }

    // Final roll
    const newDice = dice.map((d, idx) =>
      keptIndices.includes(idx) ? d : rollDice(1)[0]
    );
    setDice(newDice);
    setRollsRemaining((prev) => prev - 1);
    setHasRolledOnce(true);
    setIsRolling(false);
  };

  const handleToggleKeep = (index: number) => {
    if (!isMyTurn || isRolling || !hasRolledOnce) return;

    setKeptIndices((prev) => {
      if (prev.includes(index)) {
        // Can only un-keep if we have rolls remaining
        if (rollsRemaining > 0) {
          return prev.filter((i) => i !== index);
        }
        return prev;
      } else {
        return [...prev, index];
      }
    });
  };

  const handleEndTurn = async () => {
    if (!isMyTurn) return;

    // Must keep at least one die per roll - enforce all dice kept at end
    const finalDice = dice;
    await onEndTurn(finalDice);
  };

  const mustKeepDie = hasRolledOnce && keptIndices.length === 0 && rollsRemaining < 5;
  const canRoll = isMyTurn && rollsRemaining > 0 && !isRolling && (!mustKeepDie || keptIndices.length > 0);
  const canEndTurn = isMyTurn && hasRolledOnce && rollsRemaining === 0;
  const canEndEarly = isMyTurn && hasRolledOnce && keptIndices.length === 5;

  // Sort players by turn order
  const sortedPlayers = [...players].sort(
    (a, b) => (a.turn_order || 999) - (b.turn_order || 999)
  );

  return (
    <div className="min-h-screen bg-felt p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">
              Threes
            </h1>
            <p className="text-sm text-muted-foreground">
              Room: {game.room_code}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">${game.pot}</span>
            <span className="text-xs text-muted-foreground">pot</span>
          </div>
        </div>

        {/* Current Turn Indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer?.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 mb-6 card-glow"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                {isMyTurn ? "Your Turn!" : `${currentPlayer?.name}'s Turn`}
              </p>
              {isMyTurn && (
                <p className="text-xs text-muted-foreground">
                  {rollsRemaining} rolls remaining • Tap dice to keep
                </p>
              )}
            </div>

            {/* Dice Area */}
            {isMyTurn ? (
              <>
                <DiceContainer
                  dice={dice}
                  keptIndices={keptIndices}
                  onToggleKeep={handleToggleKeep}
                  isRolling={isRolling}
                  disabled={!hasRolledOnce}
                />

                {hasRolledOnce && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      Kept Score:{" "}
                      <span className="font-bold text-primary">
                        {currentScore}
                      </span>
                      {keptIndices.length < 5 && (
                        <>
                          {" "}
                          • Potential:{" "}
                          <span className="font-medium">{potentialScore}</span>
                        </>
                      )}
                    </p>
                  </motion.div>
                )}

                {mustKeepDie && (
                  <p className="text-center text-sm text-destructive mt-2">
                    You must keep at least one die before rolling again!
                  </p>
                )}
              </>
            ) : (
              <div className="flex justify-center gap-2">
                {(currentPlayer?.kept_dice || []).map((die, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                      {die > 0 ? (
                        <span className="text-xl font-bold">{die}</span>
                      ) : (
                        <span className="text-muted-foreground">?</span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {(currentPlayer?.kept_dice || []).length === 0 && (
                  <p className="text-muted-foreground">Waiting for roll...</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {isMyTurn && (
              <div className="flex gap-3 mt-6 justify-center">
                {canRoll && (
                  <Button
                    onClick={handleRoll}
                    disabled={isRolling}
                    size="lg"
                    className="gold-glow"
                  >
                    <Dice1 className="w-5 h-5 mr-2" />
                    {hasRolledOnce ? "Roll Again" : "Roll Dice"}
                  </Button>
                )}

                {(canEndTurn || canEndEarly) && (
                  <Button
                    onClick={handleEndTurn}
                    variant="secondary"
                    size="lg"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    End Turn ({potentialScore} pts)
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              name={player.name}
              score={player.current_score}
              keptDice={player.kept_dice || []}
              rollsRemaining={player.rolls_remaining || undefined}
              isCurrentTurn={player.id === currentPlayer?.id}
              isMe={player.id === myPlayer?.id}
              totalEarnings={player.total_earnings}
              status={player.status || undefined}
            />
          ))}
        </div>

        {/* End Game Button (host only) */}
        {myPlayer && players[0]?.session_id === myPlayer.session_id && (
          <div className="mt-8 text-center">
            <Button
              onClick={onEndGame}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              <Trophy className="w-4 h-4 mr-2" />
              End Game & Settle Up
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
