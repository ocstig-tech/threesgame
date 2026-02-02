import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Dice1, Users, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGame } from "@/hooks/useGame";
import { toast } from "sonner";

export default function Index() {
  const navigate = useNavigate();
  const { createGame, joinGame } = useGame(null);
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [betAmount, setBetAmount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      const code = await createGame(name.trim(), betAmount, phoneNumber.trim() || undefined);
      navigate(`/game/${code}`);
    } catch (error) {
      toast.error("Failed to create game");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      toast.error("Please enter the room code");
      return;
    }

    setIsLoading(true);
    try {
      const code = await joinGame(roomCode.trim(), name.trim(), phoneNumber.trim() || undefined);
      navigate(`/game/${code}`);
    } catch (error) {
      toast.error("Game not found");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center dice-shadow"
          >
            <Dice1 className="w-12 h-12 text-amber-900" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">
            Threes
          </h1>
          <p className="text-muted-foreground">
            The classic dice game
          </p>
        </div>

        {/* Menu */}
        {mode === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Button
              onClick={() => setMode("create")}
              size="lg"
              className="w-full h-16 text-lg gold-glow"
            >
              <Plus className="w-6 h-6 mr-3" />
              Create Game
            </Button>
            <Button
              onClick={() => setMode("join")}
              variant="secondary"
              size="lg"
              className="w-full h-16 text-lg"
            >
              <Users className="w-6 h-6 mr-3" />
              Join Game
            </Button>
          </motion.div>
        )}

        {/* Create Game Form */}
        {mode === "create" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Create a Game
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="For payment coordination"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="bet">Bet Amount</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="bet"
                    type="number"
                    min={0}
                    max={1000}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="text-center text-xl font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(0)}
                    className="text-xs px-2"
                  >
                    Clear
                  </Button>
                </div>
                
                {/* Quick add credit chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[2, 5, 10, 20].map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount((prev) => prev + amount)}
                      className="flex-1 min-w-[60px] bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/50 hover:from-amber-500/30 hover:to-amber-600/30 hover:border-amber-400 text-amber-200 font-bold transition-all active:scale-95"
                    >
                      +${amount}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tap chips to add • Each player pays the winner
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("menu")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="flex-1 gold-glow"
                >
                  {isLoading ? "Creating..." : "Create"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Join Game Form */}
        {mode === "join" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Join a Game
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="joinName">Your Name</Label>
                <Input
                  id="joinName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="joinPhone">
                  Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="joinPhone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="For payment coordination"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="code">Room Code</Label>
                <Input
                  id="code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  className="mt-1.5 text-center text-2xl font-mono tracking-widest uppercase"
                  maxLength={4}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("menu")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={isLoading}
                  className="flex-1 gold-glow"
                >
                  {isLoading ? "Joining..." : "Join"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rules Link */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Lowest score wins • Threes count as zero
        </p>
      </motion.div>
    </div>
  );
}
