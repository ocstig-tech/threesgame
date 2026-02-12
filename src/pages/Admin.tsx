import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Unlock, Shield, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountInfo {
  id: string;
  name: string;
  is_locked: boolean;
  failed_reset_attempts: number;
  created_at: string;
  security_color: string | null;
}

interface PlayerStats {
  total_earnings: number;
  games_played: number;
}

const SECURITY_COLORS: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

export default function Admin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [fetching, setFetching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!name.trim() || pin.length !== 4) {
      toast.error("Enter name and 4-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("player-auth", {
        body: { action: "admin_login", name: name.trim(), pin },
      });
      if (error) throw new Error("Request failed");
      if (data?.error) throw new Error(data.error);
      if (data?.admin && data?.token) {
        setAuthed(true);
        setAdminToken(data.token);
        toast.success("Admin access granted");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("player-auth", {
        body: { action: "admin_list_accounts", name: "admin" },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (error) throw error;
      const accs: AccountInfo[] = data?.accounts || [];
      setAccounts(accs);

      // Fetch stats for each account
      const statsMap: Record<string, PlayerStats> = {};
      for (const acc of accs) {
        const { data: players } = await supabase
          .from("players")
          .select("total_earnings, game_id")
          .eq("account_id", acc.id);
        
        const uniqueGames = new Set(players?.map((p) => p.game_id) || []);
        const totalEarnings = players?.reduce((sum, p) => sum + (p.total_earnings || 0), 0) || 0;
        statsMap[acc.id] = { total_earnings: totalEarnings, games_played: uniqueGames.size };
      }
      setStats(statsMap);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (authed) fetchAccounts();
  }, [authed]);

  const handleReset = async (accountName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("player-auth", {
        body: { action: "admin_clear_pin", name: accountName },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message);
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    }
  };

  const handleDelete = async (accountName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("player-auth", {
        body: { action: "admin_delete_account", name: accountName },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message);
      setDeleteTarget(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 mx-auto text-primary mb-2" />
            <h1 className="text-2xl font-bold text-primary font-serif">Admin Dashboard</h1>
          </div>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow space-y-4">
            <div>
              <Label>Admin Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter admin name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>4-Digit Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="mt-1.5 text-center text-2xl font-mono tracking-[0.5em]"
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full gold-glow" size="lg">
              {loading ? "Verifying..." : "Login"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Game
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-felt p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary font-serif">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${fetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Game
            </Button>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 card-glow mb-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{accounts.length} player accounts</span>
          </div>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/80 backdrop-blur-sm rounded-xl p-4 card-glow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {acc.security_color && (
                  <div className={`w-4 h-4 rounded-full ${SECURITY_COLORS[acc.security_color] || "bg-muted"}`} />
                )}
                <div>
                  <span className="font-semibold text-foreground">{acc.name}</span>
                  {acc.is_locked && (
                    <span className="ml-2 text-xs text-destructive font-medium">🔒 LOCKED</span>
                  )}
                  {acc.failed_reset_attempts > 0 && !acc.is_locked && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({acc.failed_reset_attempts} failed attempt{acc.failed_reset_attempts > 1 ? "s" : ""})
                    </span>
                  )}
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{stats[acc.id]?.games_played ?? 0} games</span>
                    <span className={(stats[acc.id]?.total_earnings ?? 0) >= 0 ? "text-green-500" : "text-destructive"}>
                      {(stats[acc.id]?.total_earnings ?? 0) >= 0 ? "+" : ""}{stats[acc.id]?.total_earnings ?? 0} chips
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset(acc.name)}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Unlock className="w-3 h-3 mr-1" /> Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(acc.name)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </motion.div>
          ))}
          {accounts.length === 0 && !fetching && (
            <p className="text-center text-muted-foreground py-8">No accounts found</p>
          )}
          {fetching && (
            <p className="text-center text-muted-foreground py-8">Loading accounts...</p>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">"{deleteTarget}"</span> and remove them from all games. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
