import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Dice1, Check, RotateCcw, Coins, ArrowLeft, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiceContainer } from "@/components/game/Dice";
import { PlayerCard } from "@/components/game/PlayerCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { rollDice, calculateScore } from "@/lib/gameUtils";
import threesLogo from "@/assets/threes-logo.jpg";

interface DemoPlayer {
  id: string;
  name: string;
  status: "waiting" | "rolling" | "finished";
  kept_dice: number[];
  rolls_remaining: number;
  current_score: number | null;
  total_earnings: number;
  turn_order: number;
}

const DEMO_NAMES = ["You", "Lucky Larry", "Snake Eyes Sam"];
const BET_AMOUNT = 5;

function createDemoPlayers(): DemoPlayer[] {
  return DEMO_NAMES.map((name, i) => ({
    id: `demo-${i}`,
    name,
    status: "waiting",
    kept_dice: [],
    rolls_remaining: 5,
    current_score: null,
    total_earnings: 0,
    turn_order: i + 1,
  }));
}

export default function Demo() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<DemoPlayer[]>(createDemoPlayers());
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dice, setDice] = useState<number[]>([0, 0, 0, 0, 0]);
  const [keptIndices, setKeptIndices] = useState<number[]>([]);
  const [lockedIndices, setLockedIndices] = useState<number[]>([]);
  const [rollsRemaining, setRollsRemaining] = useState(5);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResolved, setRoundResolved] = useState(false);
  const [phase, setPhase] = useState<"playing" | "round_over" | "ai_turn">("playing");
  const [message, setMessage] = useState<string | null>("Welcome to the demo! Roll your dice to start.");

  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayerIndex === 0;
  const pot = players.length * BET_AMOUNT;

  const currentScore = calculateScore(dice.filter((_, i) => keptIndices.includes(i)));
  const potentialScore = calculateScore(dice);

  const newKeptCount = keptIndices.filter(i => !lockedIndices.includes(i)).length;
  const mustKeepDie = hasRolledOnce && newKeptCount === 0 && rollsRemaining > 0;
  const allDiceKept = keptIndices.length === 5;
  const canRoll = isMyTurn && rollsRemaining > 0 && !isRolling && !mustKeepDie && !allDiceKept && phase === "playing";
  const canEndTurn = isMyTurn && hasRolledOnce && (rollsRemaining === 0 || allDiceKept) && phase === "playing";
  const canKeepAllAndEnd = isMyTurn && hasRolledOnce && !allDiceKept && phase === "playing";

  const resetForTurn = useCallback(() => {
    setDice([0, 0, 0, 0, 0]);
    setKeptIndices([]);
    setLockedIndices([]);
    setRollsRemaining(5);
    setHasRolledOnce(false);
  }, []);

  const handleRoll = async () => {
    if (!canRoll && hasRolledOnce) return;
    if (!canRoll && !hasRolledOnce && !isMyTurn) return;

    setIsRolling(true);
    const newLockedIndices = [...keptIndices];
    setLockedIndices(newLockedIndices);

    await new Promise(r => setTimeout(r, 550));

    const newDice = dice.map((d, idx) =>
      keptIndices.includes(idx) ? d : rollDice(1)[0]
    );
    setDice(newDice);
    setRollsRemaining(prev => prev - 1);
    setHasRolledOnce(true);
    setIsRolling(false);
    setMessage(null);
  };

  const handleToggleKeep = (index: number) => {
    if (!isMyTurn || isRolling || !hasRolledOnce || phase !== "playing") return;
    if (lockedIndices.includes(index)) return;

    setKeptIndices(prev => {
      if (prev.includes(index)) {
        return rollsRemaining > 0 ? prev.filter(i => i !== index) : prev;
      }
      return [...prev, index];
    });
  };

  const finishTurn = useCallback((playerIdx: number, finalDice: number[]) => {
    const score = calculateScore(finalDice);
    setPlayers(prev => prev.map((p, i) =>
      i === playerIdx ? { ...p, status: "finished", current_score: score, kept_dice: finalDice } : p
    ));
    return score;
  }, []);

  const handleEndTurn = async () => {
    if (!isMyTurn) return;
    finishTurn(0, dice);
    advanceToNext(1);
  };

  const handleKeepAllAndEnd = async () => {
    if (!isMyTurn || !hasRolledOnce) return;
    setKeptIndices([0, 1, 2, 3, 4]);
    finishTurn(0, dice);
    advanceToNext(1);
  };

  const advanceToNext = useCallback((nextIdx: number) => {
    if (nextIdx >= players.length) {
      // Round over
      setPhase("round_over");
      return;
    }
    setCurrentPlayerIndex(nextIdx);
    setPhase("ai_turn");
    resetForTurn();
    setMessage(`${DEMO_NAMES[nextIdx]} is rolling...`);
  }, [players.length, resetForTurn]);

  // Simulate AI turns
  useEffect(() => {
    if (phase !== "ai_turn") return;

    const simulateAI = async () => {
      let aiDice = rollDice(5);
      let aiKept: number[] = [];
      let aiRolls = 4; // already used 1

      // Simple AI: keep threes and low dice, roll 2-3 times
      const rollCount = 1 + Math.floor(Math.random() * 3);

      for (let r = 0; r < rollCount && aiKept.length < 5; r++) {
        await new Promise(resolve => setTimeout(resolve, 800));

        // Keep threes and values <= 2
        for (let i = 0; i < 5; i++) {
          if (!aiKept.includes(i) && (aiDice[i] === 3 || aiDice[i] <= 2)) {
            aiKept.push(i);
          }
        }
        // Must keep at least one if not first roll
        if (r > 0 && aiKept.length === 0) {
          const minIdx = aiDice.reduce((best, val, idx) =>
            !aiKept.includes(idx) && (val === 3 || val < aiDice[best]) ? idx : best, 0);
          aiKept.push(minIdx);
        }

        if (aiKept.length >= 5) break;

        // Roll remaining
        aiDice = aiDice.map((d, idx) => aiKept.includes(idx) ? d : rollDice(1)[0]);
        setDice([...aiDice]);
        setKeptIndices([...aiKept]);
        setLockedIndices([...aiKept]);
      }

      // Finalize
      setDice([...aiDice]);
      setKeptIndices([0, 1, 2, 3, 4]);
      await new Promise(resolve => setTimeout(resolve, 600));

      finishTurn(currentPlayerIndex, aiDice);

      const nextIdx = currentPlayerIndex + 1;
      if (nextIdx >= players.length) {
        setPhase("round_over");
        setMessage(null);
      } else {
        setCurrentPlayerIndex(nextIdx);
        resetForTurn();
        setMessage(`${DEMO_NAMES[nextIdx]} is rolling...`);
      }
    };

    const timer = setTimeout(simulateAI, 500);
    return () => clearTimeout(timer);
  }, [phase, currentPlayerIndex, players.length, finishTurn, resetForTurn]);

  // Resolve round (once)
  useEffect(() => {
    if (phase !== "round_over" || roundResolved) return;

    const finished = players.filter(p => p.current_score !== null);
    if (finished.length === 0) return;

    setRoundResolved(true);

    const lowestScore = Math.min(...finished.map(p => p.current_score!));
    const winners = finished.filter(p => p.current_score === lowestScore);
    const winner = winners[0];
    const losers = finished.filter(p => p.id !== winner.id);

    setPlayers(prev => prev.map(p => {
      if (p.id === winner.id) return { ...p, total_earnings: p.total_earnings + BET_AMOUNT * losers.length };
      if (losers.some(l => l.id === p.id)) return { ...p, total_earnings: p.total_earnings - BET_AMOUNT };
      return p;
    }));

    setMessage(`🏆 ${winner.name} wins with ${lowestScore} points! ${winner.name === "You" ? "Nice roll!" : ""}`);
  }, [phase, roundResolved]);

  const startNextRound = () => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      status: "waiting",
      kept_dice: [],
      rolls_remaining: 5,
      current_score: null,
    })));
    setCurrentPlayerIndex(0);
    resetForTurn();
    setPhase("playing");
    setRoundResolved(false);
    setRoundNumber(prev => prev + 1);
    setMessage("New round! Roll your dice.");
  };

  const sortedPlayers = [...players].sort((a, b) => a.turn_order - b.turn_order);

  return (
    <div className="min-h-screen bg-felt p-4 md:p-8 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-12 md:pt-0">
          <div className="flex items-center gap-3">
            <img src={threesLogo} alt="Threes" className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <h1 className="text-2xl font-display font-bold text-primary">
                Demo Game
              </h1>
              <p className="text-sm text-muted-foreground">
                Round {roundNumber} • Exhibition Mode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mr-16">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">{pot}</span>
            <span className="text-xs text-muted-foreground">chips</span>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 rounded-xl p-3 mb-4 text-center text-foreground font-medium text-sm"
          >
            {message}
          </motion.div>
        )}

        {/* Current Turn Area */}
        <div className={`bg-card/80 backdrop-blur-sm rounded-2xl p-6 mb-6 card-glow ${
          isMyTurn && phase === "playing" ? "ring-2 ring-primary" : ""
        }`}>
          <div className="text-center mb-4">
            <p className={`text-sm mb-1 ${isMyTurn && phase === "playing" ? "text-primary font-bold text-lg" : "text-muted-foreground"}`}>
              {phase === "round_over"
                ? "Round Complete!"
                : isMyTurn && phase === "playing"
                ? "🎲 Your Turn!"
                : `${currentPlayer?.name}'s Turn`}
            </p>
            {isMyTurn && phase === "playing" && (
              <p className="text-xs text-muted-foreground">
                {rollsRemaining} rolls remaining • Tap dice to keep • Must keep ≥1 per roll
              </p>
            )}
          </div>

          {/* Dice */}
          {phase !== "round_over" && (
            <>
              <DiceContainer
                dice={dice}
                keptIndices={keptIndices}
                lockedIndices={lockedIndices}
                onToggleKeep={handleToggleKeep}
                isRolling={isRolling}
                disabled={!isMyTurn || !hasRolledOnce || phase !== "playing"}
              />

              {hasRolledOnce && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isMyTurn && phase === "playing" ? (
                      <>
                        Kept Score: <span className="font-bold text-primary">{currentScore}</span>
                        {keptIndices.length < 5 && (
                          <> • Potential: <span className="font-medium">{potentialScore}</span></>
                        )}
                      </>
                    ) : (
                      <>Score: <span className="font-bold text-primary">{potentialScore}</span></>
                    )}
                  </p>
                </motion.div>
              )}

              {mustKeepDie && isMyTurn && (
                <p className="text-center text-sm text-destructive mt-2">
                  You must keep at least one die before rolling again!
                </p>
              )}
            </>
          )}

          {/* Action Buttons */}
          {isMyTurn && phase === "playing" && (
            <div className="flex gap-3 mt-6 justify-center flex-wrap">
              {!hasRolledOnce && (
                <Button onClick={handleRoll} disabled={isRolling} size="lg" className="gold-glow">
                  <Dice1 className="w-5 h-5 mr-2" /> Roll Dice
                </Button>
              )}
              {hasRolledOnce && canRoll && (
                <Button onClick={handleRoll} disabled={isRolling || mustKeepDie} size="lg" className="gold-glow">
                  <Dice1 className="w-5 h-5 mr-2" /> Roll Again
                </Button>
              )}
              {canKeepAllAndEnd && (
                <Button onClick={handleKeepAllAndEnd} variant="outline" size="lg">
                  <Check className="w-5 h-5 mr-2" /> Keep All & End ({potentialScore} pts)
                </Button>
              )}
              {canEndTurn && (
                <Button onClick={handleEndTurn} variant="secondary" size="lg">
                  <Check className="w-5 h-5 mr-2" /> End Turn ({potentialScore} pts)
                </Button>
              )}
            </div>
          )}

          {phase === "round_over" && (
            <div className="flex gap-3 mt-4 justify-center">
              <Button onClick={startNextRound} size="lg" className="gold-glow">
                <Play className="w-5 h-5 mr-2" /> Next Round
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" size="lg">
                <ArrowLeft className="w-5 h-5 mr-2" /> Exit Demo
              </Button>
            </div>
          )}
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedPlayers.map((player, i) => (
            <PlayerCard
              key={player.id}
              name={player.name}
              score={player.current_score}
              keptDice={player.kept_dice}
              rollsRemaining={player.rolls_remaining}
              isCurrentTurn={player.id === currentPlayer?.id && phase !== "round_over"}
              isMe={i === 0}
              totalEarnings={player.total_earnings}
              status={player.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
