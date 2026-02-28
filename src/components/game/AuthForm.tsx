import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SECURITY_COLORS = [
  { name: "red", bg: "bg-red-500", ring: "ring-red-400" },
  { name: "blue", bg: "bg-blue-500", ring: "ring-blue-400" },
  { name: "green", bg: "bg-green-500", ring: "ring-green-400" },
  { name: "yellow", bg: "bg-yellow-400", ring: "ring-yellow-300" },
  { name: "purple", bg: "bg-purple-500", ring: "ring-purple-400" },
  { name: "orange", bg: "bg-orange-500", ring: "ring-orange-400" },
];

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder="••••"
      className="text-center text-2xl font-mono tracking-[0.5em] mt-1.5"
    />
  );
}

function ColorPicker({
  selected,
  onSelect,
  label = "Security Color",
}: {
  selected: string;
  onSelect: (c: string) => void;
  label?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1.5 justify-center">
        {SECURITY_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onSelect(c.name)}
            className={`w-10 h-10 rounded-full ${c.bg} transition-all ${
              selected === c.name ? `ring-4 ${c.ring} scale-110` : "opacity-60 hover:opacity-100"
            }`}
            aria-label={c.name}
          />
        ))}
      </div>
    </div>
  );
}

interface AuthFormProps {
  onAuth: (account: { id: string; name: string }) => void;
  register: (name: string, pin: string, color: string) => Promise<any>;
  login: (name: string, pin: string) => Promise<any>;
  resetCode: (name: string, color: string, newPin: string) => Promise<any>;
  setNewPin: (name: string, pin: string, color: string) => Promise<any>;
}

export function AuthForm({ onAuth, register, login, resetCode, setNewPin }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "set_new_pin">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);

  // For set_new_pin flow
  const [pendingName, setPendingName] = useState("");

  const handleLogin = async () => {
    if (!name.trim()) return toast.error("Please enter your name");
    if (pin.length !== 4) return toast.error("Code must be exactly 4 digits");

    setLoading(true);
    try {
      const result = await login(name.trim(), pin);
      if (result?.needs_new_pin) {
        setPendingName(result.account_name);
        setPin("");
        setColor("");
        setMode("set_new_pin");
        toast.info("Your code was reset. Please set a new code and security color.");
      } else {
        onAuth(result);
        toast.success("Welcome back!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) return toast.error("Please enter your name");
    if (pin.length !== 4) return toast.error("Code must be exactly 4 digits");
    if (!color) return toast.error("Please select a security color");

    setLoading(true);
    try {
      const acc = await register(name.trim(), pin, color);
      onAuth(acc);
      toast.success("Account created!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!name.trim()) return toast.error("Please enter your name");
    if (!color) return toast.error("Select your security color");
    if (pin.length !== 4) return toast.error("New code must be exactly 4 digits");

    setLoading(true);
    try {
      const acc = await resetCode(name.trim(), color, pin);
      onAuth(acc);
      toast.success("Code updated! You're logged in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (pin.length !== 4) return toast.error("Code must be exactly 4 digits");
    if (!color) return toast.error("Please select a security color");

    setLoading(true);
    try {
      const acc = await setNewPin(pendingName, pin, color);
      onAuth(acc);
      toast.success("Welcome back! New code set.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow"
    >
      <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
        {mode === "login" && "Sign In"}
        {mode === "register" && "Create Account"}
        {mode === "forgot" && "Reset Code"}
        {mode === "set_new_pin" && "Set New Code"}
      </h2>

      <div className="space-y-4">
        {/* Name input (not shown for set_new_pin since we already have it) */}
        {mode !== "set_new_pin" && (
          <div>
            <Label htmlFor="authName">Player Name</Label>
            <Input
              id="authName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1.5"
              maxLength={20}
            />
          </div>
        )}

        {mode === "set_new_pin" && (
          <p className="text-center text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{pendingName}</span>
          </p>
        )}

        {/* Pin input */}
        <div>
          <Label>{mode === "forgot" ? "New 4-Digit Code" : "4-Digit Code"}</Label>
          <PinInput value={pin} onChange={setPin} />
        </div>

        {/* Color picker for register, forgot, and set_new_pin */}
        {(mode === "register" || mode === "forgot" || mode === "set_new_pin") && (
          <ColorPicker
            selected={color}
            onSelect={setColor}
            label={mode === "forgot" ? "Your Security Color" : "Choose Security Color"}
          />
        )}

        {/* Action button */}
        <Button
          onClick={
            mode === "login"
              ? handleLogin
              : mode === "register"
              ? handleRegister
              : mode === "forgot"
              ? handleForgot
              : handleSetNewPin
          }
          disabled={loading}
          className="w-full gold-glow"
          size="lg"
        >
          {loading
            ? "Loading..."
            : mode === "login"
            ? "Sign In"
            : mode === "register"
            ? "Create Account"
            : mode === "forgot"
            ? "Reset & Sign In"
            : "Set Code & Sign In"}
        </Button>

        {/* Mode switching links */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          {mode === "login" && (
            <div className="flex justify-between">
              <button onClick={() => { setMode("register"); setPin(""); setColor(""); }} className="text-primary underline">
                Create New Player Account
              </button>
              <button onClick={() => { setMode("forgot"); setPin(""); setColor(""); }} className="text-primary underline">
                Forgot Code?
              </button>
            </div>
          )}
          {mode === "register" && (
            <p>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setPin(""); setColor(""); }} className="text-primary underline">
                Sign In
              </button>
            </p>
          )}
          {(mode === "forgot" || mode === "set_new_pin") && (
            <p>
              <button onClick={() => { setMode("login"); setPin(""); setColor(""); }} className="text-primary underline">
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
