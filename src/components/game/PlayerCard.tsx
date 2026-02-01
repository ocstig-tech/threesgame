import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dice } from "./Dice";
import { formatCurrency } from "@/lib/gameUtils";

interface PlayerCardProps {
  name: string;
  score?: number | null;
  keptDice?: number[];
  rollsRemaining?: number;
  isCurrentTurn?: boolean;
  isMe?: boolean;
  isWinner?: boolean;
  totalEarnings?: number;
  rollOffValue?: number | null;
  status?: string;
}

export function PlayerCard({
  name,
  score,
  keptDice = [],
  rollsRemaining,
  isCurrentTurn = false,
  isMe = false,
  isWinner = false,
  totalEarnings = 0,
  rollOffValue,
  status,
}: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all duration-300",
        "bg-card/80 backdrop-blur-sm",
        isCurrentTurn && "ring-2 ring-primary animate-pulse-gold",
        isWinner && "ring-2 ring-emerald-400 winner-glow",
        isMe && "border-primary/50"
      )}
    >
      {/* Current turn indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
          Rolling
        </div>
      )}

      {/* Me indicator */}
      {isMe && (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
          You
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground truncate">{name}</h3>
        {rollOffValue !== undefined && rollOffValue !== null && (
          <Dice value={rollOffValue} size="sm" disabled />
        )}
      </div>

      {/* Kept dice display */}
      {keptDice.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {keptDice.map((die, i) => (
            <Dice key={i} value={die} size="sm" disabled />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        {score !== null && score !== undefined ? (
          <span className="font-medium">
            Score: <span className="text-primary font-bold">{score}</span>
          </span>
        ) : status === "finished" ? (
          <span className="text-muted-foreground">Finished</span>
        ) : rollsRemaining !== undefined ? (
          <span className="text-muted-foreground">
            {rollsRemaining} rolls left
          </span>
        ) : (
          <span className="text-muted-foreground">Waiting</span>
        )}

        <span
          className={cn(
            "font-semibold",
            totalEarnings > 0 && "text-emerald-400",
            totalEarnings < 0 && "text-red-400",
            totalEarnings === 0 && "text-muted-foreground"
          )}
        >
          {formatCurrency(totalEarnings)}
        </span>
      </div>
    </motion.div>
  );
}
