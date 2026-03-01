import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface DiceProps {
  value: number;
  isKept?: boolean;
  isLocked?: boolean;
  isRolling?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Random position/rotation for scattered layout */
  scatter?: { x: number; y: number; rotate: number };
}

// Classic pip positions as percentage offsets from center
const pipLayouts: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

const sizePx = { sm: 44, md: 56, lg: 64 };
const pipSize = { sm: 6, md: 8, lg: 10 };
const pipSpread = { sm: 10, md: 13, lg: 15 };

export function Dice({
  value,
  isKept = false,
  isLocked = false,
  isRolling = false,
  onClick,
  size = "md",
  disabled = false,
  scatter,
}: DiceProps) {
  const pips = pipLayouts[value] || [];
  const isThree = value === 3;
  const s = sizePx[size];
  const ps = pipSize[size];
  const spread = pipSpread[size];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isRolling || isLocked}
      layout
      style={{
        width: s,
        height: s,
        x: scatter?.x ?? 0,
        y: scatter?.y ?? 0,
      }}
      className={cn(
        "relative cursor-pointer flex-shrink-0",
        (disabled || isLocked) && "cursor-not-allowed",
      )}
      animate={
        isRolling
          ? {
              rotate: [0, 120, 240, 360],
              scale: [1, 0.8, 1.15, 1],
              x: [scatter?.x ?? 0, (scatter?.x ?? 0) + 8, (scatter?.x ?? 0) - 5, scatter?.x ?? 0],
              y: [scatter?.y ?? 0, (scatter?.y ?? 0) - 12, (scatter?.y ?? 0) + 6, scatter?.y ?? 0],
            }
          : {
              rotate: scatter?.rotate ?? 0,
              scale: 1,
              x: scatter?.x ?? 0,
              y: scatter?.y ?? 0,
            }
      }
      transition={
        isRolling
          ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 300, damping: 20 }
      }
      whileHover={!disabled && !isRolling && !isLocked ? { scale: 1.1, zIndex: 10 } : undefined}
      whileTap={!disabled && !isRolling && !isLocked ? { scale: 0.9 } : undefined}
    >
      {/* Die body — 3D ivory look */}
      <div
        className={cn(
          "w-full h-full rounded-[18%] relative overflow-hidden",
          isKept && !isLocked && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background",
          isLocked && "ring-2 ring-muted-foreground/50 ring-offset-2 ring-offset-background opacity-60",
        )}
        style={{
          background: isThree
            ? "linear-gradient(145deg, #4ade80 0%, #22c55e 40%, #16a34a 100%)"
            : "linear-gradient(145deg, #fef3c7 0%, #fde68a 30%, #f59e0b 80%, #d97706 100%)",
          boxShadow: isThree
            ? `0 2px 3px rgba(0,0,0,0.2),
               0 6px 12px rgba(0,0,0,0.25),
               0 10px 20px rgba(0,0,0,0.15),
               inset 0 1px 2px rgba(255,255,255,0.4),
               inset 0 -2px 4px rgba(0,0,0,0.15)`
            : `0 2px 3px rgba(0,0,0,0.2),
               0 6px 12px rgba(0,0,0,0.25),
               0 10px 20px rgba(0,0,0,0.15),
               inset 0 1px 2px rgba(255,255,255,0.5),
               inset 0 -2px 4px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Highlight sheen */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "8%",
            left: "12%",
            width: "45%",
            height: "35%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Pips */}
        {pips.map(([px, py], i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: ps,
              height: ps,
              left: `calc(50% + ${px * spread}px - ${ps / 2}px)`,
              top: `calc(50% + ${py * spread}px - ${ps / 2}px)`,
              background: isThree
                ? "radial-gradient(circle, #052e16 60%, #064e3b 100%)"
                : "radial-gradient(circle, #451a03 60%, #78350f 100%)",
              boxShadow: isThree
                ? "inset 0 1px 2px rgba(0,0,0,0.4), 0 0.5px 0 rgba(255,255,255,0.15)"
                : "inset 0 1px 2px rgba(0,0,0,0.3), 0 0.5px 0 rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Locked indicator */}
      {isLocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-muted-foreground rounded-full flex items-center justify-center z-10">
          <Lock className="w-2.5 h-2.5 text-background" />
        </div>
      )}

      {/* Kept indicator */}
      {isKept && !isLocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center z-10 shadow-md"
        >
          <span className="text-[10px] font-bold text-emerald-900">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
}

// Generate random scatter positions for dice
function generateScatter(count: number, kept: number[], locked: number[]): { x: number; y: number; rotate: number }[] {
  const positions: { x: number; y: number; rotate: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (kept.includes(i) || locked.includes(i)) {
      // Kept/locked dice get mild scatter
      positions.push({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 6,
        rotate: (Math.random() - 0.5) * 8,
      });
    } else {
      positions.push({
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 40,
        rotate: (Math.random() - 0.5) * 30,
      });
    }
  }
  return positions;
}

interface DiceContainerProps {
  dice: number[];
  keptIndices: number[];
  lockedIndices?: number[];
  onToggleKeep: (index: number) => void;
  isRolling?: boolean;
  disabled?: boolean;
}

export function DiceContainer({
  dice,
  keptIndices,
  lockedIndices = [],
  onToggleKeep,
  isRolling = false,
  disabled = false,
}: DiceContainerProps) {
  const [scatterPositions, setScatterPositions] = useState<{ x: number; y: number; rotate: number }[]>(
    () => generateScatter(5, [], [])
  );

  // Re-scatter when dice values change (i.e., after a roll) but NOT when just toggling kept
  const diceKey = dice.join(",");
  useEffect(() => {
    setScatterPositions(generateScatter(dice.length, keptIndices, lockedIndices));
    // Only regenerate on dice value changes, not kept changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceKey]);

  return (
    <div className="relative flex flex-wrap gap-2 justify-center items-center min-h-[100px] py-4 px-2">
      {dice.map((value, index) => (
        <Dice
          key={index}
          value={value}
          isKept={keptIndices.includes(index)}
          isLocked={lockedIndices.includes(index)}
          isRolling={isRolling && !keptIndices.includes(index)}
          onClick={() => onToggleKeep(index)}
          size="lg"
          disabled={disabled}
          scatter={scatterPositions[index]}
        />
      ))}
    </div>
  );
}
