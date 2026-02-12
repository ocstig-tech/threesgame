import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGame } from "@/hooks/useGame";
import { usePlayerAccount } from "@/hooks/usePlayerAccount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthForm } from "@/components/game/AuthForm";
import { toast } from "sonner";
import threesLogo from "@/assets/threes-logo.jpg";
export default function Index() {
  const navigate = useNavigate();
  const {
    account,
    isLoading: accountLoading,
    register,
    login,
    logout,
    resetCode,
    setNewPin,
  } = usePlayerAccount();
  const {
    createGame,
    joinGame
  } = useGame(null);
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [betAmount, setBetAmount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const handleCreate = async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      const code = await createGame(account.name, betAmount);
      navigate(`/game/${code}`);
    } catch (error) {
      toast.error("Failed to create game");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleJoin = async () => {
    if (!account) return;
    if (!roomCode.trim()) {
      toast.error("Please enter the room code");
      return;
    }
    setIsLoading(true);
    try {
      const code = await joinGame(roomCode.trim(), account.name);
      navigate(`/game/${code}`);
    } catch (error) {
      toast.error("Game not found");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  if (accountLoading) return null;
  return <div className="min-h-screen bg-felt flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {account && <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" />
            {account.name}
          </Button>}
        <ThemeToggle />
      </div>

      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div initial={{
          scale: 0,
          rotate: -180
        }} animate={{
          scale: 1,
          rotate: 0
        }} transition={{
          type: "spring",
          duration: 0.8
        }} className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden dice-shadow">
            <img src={threesLogo} alt="Threes" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 font-serif">
            THR33s
          </h1>
          <p className="text-muted-foreground">​Bring on the Box Cars                     </p>
        </div>

        {/* Auth Screen */}
        {!account && (
          <AuthForm
            onAuth={() => {}}
            register={register}
            login={login}
            resetCode={resetCode}
            setNewPin={setNewPin}
          />
        )}

        {/* Game Menu (logged in) */}
        {account && mode === "menu" && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="space-y-4">
            <Button onClick={() => setMode("create")} size="lg" className="w-full h-16 text-lg gold-glow">
              <Plus className="w-6 h-6 mr-3" />
              Create Game
            </Button>
            <Button onClick={() => setMode("join")} variant="secondary" size="lg" className="w-full h-16 text-lg">
              <Users className="w-6 h-6 mr-3" />
              Join Game
            </Button>
          </motion.div>}

        {/* Create Game Form */}
        {account && mode === "create" && <motion.div initial={{
        opacity: 0,
        x: 20
      }} animate={{
        opacity: 1,
        x: 0
      }} className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow">
            <h2 className="text-xl font-semibold text-foreground mb-6">Create a Game</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bet">Chips Per Round</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input id="bet" type="number" min={0} max={1000} value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} className="text-center text-xl font-bold" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setBetAmount(0)} className="text-xs px-2">
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[2, 5, 10, 20].map(amount => <Button key={amount} type="button" variant="outline" size="sm" onClick={() => setBetAmount(prev => prev + amount)} className="flex-1 min-w-[60px] bg-gradient-to-br from-primary/20 to-primary/30 border-primary/50 hover:from-primary/30 hover:to-primary/40 hover:border-primary text-foreground font-bold transition-all active:scale-95">
                      +{amount}
                    </Button>)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tap to add chips • Winner takes the pot each round
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isLoading} className="flex-1 gold-glow">
                  {isLoading ? "Creating..." : "Create"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>}

        {/* Join Game Form */}
        {account && mode === "join" && <motion.div initial={{
        opacity: 0,
        x: 20
      }} animate={{
        opacity: 1,
        x: 0
      }} className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow">
            <h2 className="text-xl font-semibold text-foreground mb-6">Join a Game</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Room Code</Label>
                <Input id="code" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" className="mt-1.5 text-center text-2xl font-mono tracking-widest" maxLength={4} inputMode="numeric" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleJoin} disabled={isLoading} className="flex-1 gold-glow">
                  {isLoading ? "Joining..." : "Join"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>}

        <p className="text-center text-sm mt-8 font-medium text-primary font-serif px-0">Lowest score wins    •    Threes = Zero    •    For Exhibition Only  
    
      </p>
      </motion.div>
    </div>;
}