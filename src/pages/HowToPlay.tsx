import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function HowToPlay() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: "🎯",
      title: "Objective",
      content:
        "THREEs is a social dice game for 2 or more players using five dice. The goal is to finish with the lowest possible score. Threes (3s) are worth zero — so they're golden. Every other die counts at face value.",
    },
    {
      icon: "🪙",
      title: "The Stakes",
      content:
        "Before play begins, all players agree on a point amount for the round — typically 2 to 100 points. Every player puts that amount into the shared pool. The winner of the round takes the entire pool.\n\nAll players must agree on the point amount before the round starts.",
    },
    {
      icon: "🎲",
      title: "Who Goes First",
      content:
        "Each player rolls one die. The highest roll goes first.\n\nIn the case of a tie, those tied players roll again until a clear winner emerges.\n\nAfter the first round, the winner of each round rolls first in the next.\n\nPlay continues clockwise from the starting player.",
    },
    {
      icon: "🎮",
      title: "Your Turn",
      content:
        "Roll all five dice.\n\nChoose which dice to keep (set aside). You must keep at least one die per roll.\n\nOnce a die is set aside, it stays for the rest of your turn — you cannot un-keep it.\n\nRoll the remaining dice. Again, keep at least one.\n\nContinue until all five dice are set aside. Your score is the sum of all kept dice.",
      tip: "Keep your 3s (worth zero) and low values. Leave high dice to re-roll for a better result.",
    },
    {
      icon: "🃏",
      title: "The Rule of Threes",
      content:
        "Any die showing 3 is worth zero points. It does not add to your score. Rolling five threes gives you a perfect score of 0 — the best possible result.",
    },
    {
      icon: "🏆",
      title: "Winning a Round",
      content:
        "After all players have taken their turn, compare totals.\n\nThe player with the lowest score wins the round and takes all points in the pool.\n\nMinimum score: 0 (five threes).\nMaximum score: 30 (five sixes).",
    },
    {
      icon: "🤝",
      title: "Tie-Breaks",
      content:
        "If two or more players share the lowest score, it's a tie. All players must add an additional point amount equal to the original stake into the pool. Everyone then plays a fresh round. The winner of the tie-break round takes the entire accumulated pool.",
    },
  ];

  return (
    <div
      className="min-h-screen bg-felt p-4"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-2xl font-bold text-primary tracking-wider"
            style={{
              fontFamily: "'Marcellus', serif",
              WebkitTextStroke: "1px hsl(0, 70%, 45%)",
              paintOrder: "stroke fill",
            }}
          >
            How to Play
          </h1>
        </div>

        <p className="text-muted-foreground text-sm mb-6 italic">
          Paul's Black Label Edition — Official Rules
        </p>

        <div className="space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card/80 backdrop-blur-sm rounded-xl p-5 card-glow"
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {section.icon} {section.title}
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
              {section.tip && (
                <p className="text-xs text-primary mt-3 font-medium italic">
                  💡 Strategy: {section.tip}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-8 mb-4 text-center">
          <Button
            onClick={() => navigate("/")}
            className="gold-glow"
          >
            Back to Table ♠
          </Button>
        </div>
      </div>
    </div>
  );
}
