import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DiceProps {
  value: number;
  isKept?: boolean;
  isRolling?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const dotPositions: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-16 h-16",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function Dice({
  value,
  isKept = false,
  isRolling = false,
  onClick,
  size = "md",
  disabled = false,
}: DiceProps) {
  const dots = dotPositions[value] || [];
  const isThree = value === 3;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isRolling}
      className={cn(
        sizeClasses[size],
        "relative rounded-lg cursor-pointer transition-all duration-200",
        "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600",
        "dice-shadow",
        isKept && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background",
        isThree && "from-emerald-400 via-emerald-500 to-emerald-600",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !isRolling && "hover:scale-105 active:scale-95"
      )}
      animate={
        isRolling
          ? {
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.1, 1, 1.1, 1],
            }
          : { rotate: 0, scale: 1 }
      }
      transition={
        isRolling
          ? { duration: 0.5, repeat: Infinity, ease: "linear" }
          : { duration: 0.2 }
      }
      whileHover={!disabled && !isRolling ? { scale: 1.05 } : undefined}
      whileTap={!disabled && !isRolling ? { scale: 0.95 } : undefined}
    >
      {/* Dice dots */}
      <div className="absolute inset-0 flex items-center justify-center">
        {dots.map(([x, y], index) => (
          <div
            key={index}
            className={cn(
              dotSizes[size],
              "absolute rounded-full",
              isThree ? "bg-emerald-900" : "bg-amber-900"
            )}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      {/* Kept indicator */}
      {isKept && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
        >
          <span className="text-[10px] font-bold text-emerald-900">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
}

interface DiceContainerProps {
  dice: number[];
  keptIndices: number[];
  onToggleKeep: (index: number) => void;
  isRolling?: boolean;
  disabled?: boolean;
}

export function DiceContainer({
  dice,
  keptIndices,
  onToggleKeep,
  isRolling = false,
  disabled = false,
}: DiceContainerProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {dice.map((value, index) => (
        <Dice
          key={index}
          value={value}
          isKept={keptIndices.includes(index)}
          isRolling={isRolling && !keptIndices.includes(index)}
          onClick={() => onToggleKeep(index)}
          size="lg"
          disabled={disabled}
        />
      ))}
    </div>
  );
}
