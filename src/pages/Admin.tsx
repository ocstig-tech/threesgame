import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Unlock, Shield, Users, Trash2, Trophy, Coins, Gamepad2, TrendingUp, Clock, Calendar } from "lucide-react";
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
  rounds_won: number;
  rounds_played: number;
  best_score: number | null;
  worst_score: number | null;
  last_played: string | null;
}

interface ActiveGame {
  id: string;
  room_code: string;
  status: string;
  host_name: string;
  bet_amount: number;
  pot: number;
  player_count: number;
  created_at: string;
}

interface OverallStats {
  totalAccounts: number;
  totalGamesPlayed: number;
  totalRoundsPlayed: number;
  totalChipsWon: number;
  activeGames: number;
}

const SECURITY_COLORS: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 card-glow">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className={`w-4 h-4 ${color || ""}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalAccounts: 0,
    totalGamesPlayed: 0,
    totalRoundsPlayed: 0,
    totalChipsWon: 0,
    activeGames: 0,
  });
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

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

      // Fetch stats via admin edge function (service role, bypasses RLS)
      const { data: statsData, error: statsError } = await supabase.functions.invoke("player-auth", {
        body: { action: "admin_get_stats", name: "admin" },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (statsError) throw statsError;

      const allPlayers = statsData?.players || [];
      const allRounds = statsData?.rounds || [];
      const allGames = statsData?.active_games || [];

      // Build player ID to account ID map
      const pidToAccount: Record<string, string> = {};
      allPlayers.forEach((p: any) => {
        if (p.account_id) pidToAccount[p.id] = p.account_id;
      });

      // Count players per active game
      const activeGamesList: ActiveGame[] = [];
      if (allGames) {
        for (const g of allGames) {
          const playerCount = allPlayers.filter((p: any) => p.game_id === g.id).length || 0;
          activeGamesList.push({
            id: g.id,
            room_code: g.room_code,
            status: g.status,
            host_name: g.host_name,
            bet_amount: g.bet_amount,
            pot: g.pot,
            player_count: playerCount,
            created_at: g.created_at,
          });
        }
      }
      setActiveGames(activeGamesList);

      // Build per-account stats
      const statsMap: Record<string, PlayerStats> = {};
      let totalChipsWon = 0;

      for (const acc of accs) {
        const accountPlayers = allPlayers.filter((p: any) => p.account_id === acc.id) || [];
        const uniqueGames = new Set(accountPlayers.map((p: any) => p.game_id));
        const totalEarnings = accountPlayers.reduce((sum: number, p: any) => sum + (p.total_earnings || 0), 0);

        // Rounds won by this account
        const roundsWon = allRounds.filter((r: any) => r.winner_id && pidToAccount[r.winner_id] === acc.id).length || 0;

        // Total rounds this account participated in
        const accountGameIds = new Set(accountPlayers.map((p: any) => p.game_id));
        const roundsPlayed = allRounds.filter((r: any) => accountGameIds.has(r.game_id)).length || 0;

        // Best and worst scores
        const scores = accountPlayers.map((p: any) => p.current_score).filter((s: any): s is number => s !== null && s > 0);
        const bestScore = scores.length > 0 ? Math.min(...scores) : null;
        const worstScore = scores.length > 0 ? Math.max(...scores) : null;

        // Last played
        const dates = accountPlayers.map((p: any) => p.created_at).sort();
        const lastPlayed = dates.length > 0 ? dates[dates.length - 1] : null;

        if (totalEarnings > 0) totalChipsWon += totalEarnings;

        statsMap[acc.id] = {
          total_earnings: totalEarnings,
          games_played: uniqueGames.size,
          rounds_won: roundsWon,
          rounds_played: roundsPlayed,
          best_score: bestScore,
          worst_score: worstScore,
          last_played: lastPlayed,
        };
      }
      setStats(statsMap);

      // Overall stats
      const allGameIds = new Set(allPlayers.map((p: any) => p.game_id) || []);
      setOverallStats({
        totalAccounts: accs.length,
        totalGamesPlayed: allGameIds.size,
        totalRoundsPlayed: allRounds.length || 0,
        totalChipsWon,
        activeGames: activeGamesList.length,
      });
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
              <Label>Admin Code (4-20 chars)</Label>
              <Input
                type="password"
                maxLength={20}
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 20))}
                placeholder="Enter code"
                className="mt-1.5 text-center text-xl font-mono tracking-widest"
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
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

        {/* Overall Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard icon={Users} label="Players" value={overallStats.totalAccounts} />
          <StatCard icon={Gamepad2} label="Games Played" value={overallStats.totalGamesPlayed} />
          <StatCard icon={Trophy} label="Rounds Played" value={overallStats.totalRoundsPlayed} />
          <StatCard
            icon={Coins}
            label="Total Chips Won"
            value={overallStats.totalChipsWon}
            color="text-green-500"
          />
          <StatCard
            icon={Clock}
            label="Active Games"
            value={overallStats.activeGames}
            color={overallStats.activeGames > 0 ? "text-primary" : ""}
          />
        </div>

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" /> Active Games
            </h2>
            <div className="space-y-2">
              {activeGames.map((g) => (
                <div
                  key={g.id}
                  className="bg-card/80 backdrop-blur-sm rounded-xl p-3 card-glow flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-primary text-sm">{g.room_code}</span>
                    <span className="text-muted-foreground text-xs ml-2">by {g.host_name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{g.player_count} player{g.player_count !== 1 ? "s" : ""}</span>
                      <span>{g.bet_amount} chip bet</span>
                      <span>{g.pot} in pot</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {g.status.replace(/_/g, " ")}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">{timeAgo(g.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Accounts */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Player Accounts ({accounts.length})
        </h2>

        <div className="space-y-2">
          {accounts.map((acc) => {
            const s = stats[acc.id];
            const winRate = s && s.rounds_played > 0
              ? Math.round((s.rounds_won / s.rounds_played) * 100)
              : 0;
            const isExpanded = expandedPlayer === acc.id;

            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/80 backdrop-blur-sm rounded-xl card-glow overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedPlayer(isExpanded ? null : acc.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {acc.security_color && (
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${SECURITY_COLORS[acc.security_color] || "bg-muted"}`} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{acc.name}</span>
                        {acc.is_locked && (
                          <span className="text-xs text-destructive font-medium">🔒 LOCKED</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{s?.games_played ?? 0} games</span>
                        <span className={(s?.total_earnings ?? 0) >= 0 ? "text-green-500" : "text-destructive"}>
                          {(s?.total_earnings ?? 0) >= 0 ? "+" : ""}{s?.total_earnings ?? 0} chips
                        </span>
                        {s && s.rounds_played > 0 && (
                          <span className="text-primary">{winRate}% win</span>
                        )}
                        {s?.last_played && (
                          <span className="hidden sm:inline">last {timeAgo(s.last_played)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleReset(acc.name); }}
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Unlock className="w-3 h-3 mr-1" /> Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(acc.name); }}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && s && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 border-t border-border/50"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{s.rounds_won}</div>
                        <div className="text-xs text-muted-foreground">Rounds Won</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{s.rounds_played}</div>
                        <div className="text-xs text-muted-foreground">Rounds Played</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{s.best_score ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Best Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{s.worst_score ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Worst Score</div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(acc.created_at).toLocaleDateString()}
                      </span>
                      {acc.failed_reset_attempts > 0 && (
                        <span className="text-destructive">
                          {acc.failed_reset_attempts} failed reset attempt{acc.failed_reset_attempts > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
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
