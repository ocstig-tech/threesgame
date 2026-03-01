import { useState } from "react";
import { RotateCcw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BetweenRoundsPromptProps {
  isHost: boolean;
  betAmount: number;
  onStartNextRound: () => Promise<void>;
  onChangeBet: (newBet: number) => Promise<void>;
}

export function BetweenRoundsPrompt({
  isHost,
  betAmount,
  onStartNextRound,
  onChangeBet,
}: BetweenRoundsPromptProps) {
  const [editingBet, setEditingBet] = useState(false);
  const [newBet, setNewBet] = useState(betAmount);

  const handleSaveBet = async () => {
    await onChangeBet(newBet);
    setEditingBet(false);
  };

  return (
    <div className="mb-5 rounded-xl border border-border bg-secondary/30 p-4 text-center">
      <p className="text-foreground font-medium">Round complete</p>
      <p className="text-sm text-muted-foreground mt-1">
        {isHost
          ? "Start the next round when everyone is ready."
          : "Waiting for the host to start the next round."}
      </p>

      {isHost && (
        <div className="mt-4 space-y-3">
          {editingBet ? (
            <div className="flex items-center justify-center gap-2">
              <Label className="text-sm whitespace-nowrap">Chips:</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={newBet}
                onChange={(e) => setNewBet(Number(e.target.value))}
                className="w-24 text-center font-bold"
              />
              <div className="flex flex-wrap gap-1">
                {[2, 5, 10, 20].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewBet((prev) => prev + amt)}
                    className="px-2 text-xs bg-gradient-to-br from-primary/20 to-primary/30 border-primary/50 hover:from-primary/30 hover:to-primary/40 font-bold"
                  >
                    +{amt}
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={handleSaveBet}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingBet(false);
                  setNewBet(betAmount);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingBet(true)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors underline"
            >
              <Coins className="w-3.5 h-3.5" />
              Change ante ({betAmount} chips)
            </button>
          )}

          <div className="flex justify-center">
            <Button
              onClick={async () => {
                try {
                  await onStartNextRound();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to start next round");
                }
              }}
              className="gold-glow"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Start Next Round
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
