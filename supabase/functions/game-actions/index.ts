import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://threesgame.lovable.app",
  "https://id-preview--167792c5-866d-4eb6-8181-13a1774ed253.lovable.app",
  "https://167792c5-866d-4eb6-8181-13a1774ed253.lovableproject.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "capacitor://localhost",
  "http://localhost",
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// ─── VALIDATION HELPERS ───

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(val: unknown): val is string {
  return typeof val === "string" && UUID_RE.test(val);
}

function isValidDiceArray(val: unknown): val is number[] {
  return (
    Array.isArray(val) &&
    val.length >= 0 &&
    val.length <= 5 &&
    val.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= 6)
  );
}

function isValidName(val: unknown): val is string {
  return typeof val === "string" && val.trim().length >= 1 && val.trim().length <= 30;
}

function isValidRoomCode(val: unknown): val is string {
  return typeof val === "string" && /^[A-Za-z0-9]{4}$/.test(val.trim());
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function calculateScore(dice: number[]): number {
  return dice.reduce((sum: number, die: number) => sum + (die === 3 ? 0 : die), 0);
}

function generateRoomCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

// ─── HOST AUTHORIZATION HELPER ───
async function verifyHost(
  supabase: ReturnType<typeof createClient>,
  game_id: string,
  session_id: string
): Promise<{ authorized: boolean; error?: string }> {
  const { data: game } = await supabase.from("games").select("host_name").eq("id", game_id).single();
  if (!game) return { authorized: false, error: "Game not found" };

  const { data: hostPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("game_id", game_id)
    .eq("name", game.host_name)
    .eq("session_id", session_id)
    .single();

  if (!hostPlayer) return { authorized: false, error: "Only the host can perform this action" };
  return { authorized: true };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, session_id, game_id, ...params } = body;

    if (!action || typeof action !== "string") return json({ error: "Missing action" }, 400);

    // Validate session_id when provided
    if (session_id !== undefined && !isValidUUID(session_id)) {
      return json({ error: "Invalid session_id" }, 400);
    }
    // Validate game_id when provided
    if (game_id !== undefined && !isValidUUID(game_id)) {
      return json({ error: "Invalid game_id" }, 400);
    }

    // ─── CREATE GAME ───
    if (action === "create_game") {
      const { host_name, bet_amount, account_id } = params;
      if (!isValidName(host_name)) return json({ error: "Invalid host name (1-30 chars)" }, 400);
      if (!session_id) return json({ error: "Missing session_id" }, 400);
      if (account_id !== undefined && !isValidUUID(account_id)) return json({ error: "Invalid account_id" }, 400);
      const bet = Math.max(1, Math.min(100, Number(bet_amount) || 5));

      const roomCode = generateRoomCode();
      const { data: game, error: gameErr } = await supabase
        .from("games")
        .insert({ room_code: roomCode, host_name: host_name.trim(), bet_amount: bet })
        .select()
        .single();
      if (gameErr) throw gameErr;

      const { data: player, error: playerErr } = await supabase.from("players").insert({
        game_id: game.id,
        name: host_name.trim(),
        session_id,
        account_id: account_id || session_id,
      }).select("id").single();
      if (playerErr) throw playerErr;

      return json({ room_code: roomCode, player_id: player.id });
    }

    // ─── JOIN GAME ───
    if (action === "join_game") {
      const { room_code, player_name, account_id } = params;
      if (!isValidRoomCode(room_code)) return json({ error: "Invalid room code" }, 400);
      if (!isValidName(player_name)) return json({ error: "Invalid player name (1-30 chars)" }, 400);
      if (!session_id) return json({ error: "Missing session_id" }, 400);
      if (account_id !== undefined && !isValidUUID(account_id)) return json({ error: "Invalid account_id" }, 400);

      const { data: game, error: gameErr } = await supabase
        .from("games")
        .select("*")
        .eq("room_code", room_code.toUpperCase())
        .single();
      if (gameErr || !game) return json({ error: "Unable to join game" }, 404);

      // Check if already joined
      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("game_id", game.id)
        .eq("session_id", session_id)
        .single();
      if (existing) return json({ room_code: room_code.toUpperCase(), player_id: existing.id });

      const { data: player, error: playerErr } = await supabase.from("players").insert({
        game_id: game.id,
        name: player_name.trim(),
        session_id,
        account_id: account_id || session_id,
      }).select("id").single();
      if (playerErr) throw playerErr;

      return json({ room_code: room_code.toUpperCase(), player_id: player.id });
    }

    // ─── START ROLL OFF (host only) ───
    if (action === "start_roll_off") {
      if (!game_id || !session_id) return json({ error: "Missing parameters" }, 400);
      const hostCheck = await verifyHost(supabase, game_id, session_id);
      if (!hostCheck.authorized) return json({ error: hostCheck.error }, 403);

      // Guard: only transition from "waiting"
      const { data: game } = await supabase.from("games").select("status").eq("id", game_id).single();
      if (!game || game.status !== "waiting") return json({ error: "Unable to complete action" }, 409);

      await supabase.from("games").update({ status: "roll_off" }).eq("id", game_id);
      return json({ success: true });
    }

    // ─── ROLL FOR TURN ORDER ───
    if (action === "roll_for_turn_order") {
      const { player_id } = params;
      if (!isValidUUID(player_id)) return json({ error: "Invalid player_id" }, 400);
      const rollValue = rollDie();
      await supabase.from("players").update({ roll_off_value: rollValue }).eq("id", player_id);
      return json({ roll_value: rollValue });
    }

    // ─── START GAME (host only, after roll-off) ───
    if (action === "start_game") {
      if (!game_id || !session_id) return json({ error: "Missing parameters" }, 400);
      const hostCheck = await verifyHost(supabase, game_id, session_id);
      if (!hostCheck.authorized) return json({ error: hostCheck.error }, 403);

      const { data: game } = await supabase.from("games").select("*").eq("id", game_id).single();
      if (!game) return json({ error: "Unable to complete action" }, 404);
      // Guard: only start from roll_off or tie_breaker
      if (game.status !== "roll_off" && game.status !== "tie_breaker") return json({ error: "Unable to complete action" }, 409);

      const { data: players } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game_id);
      if (!players) return json({ error: "Unable to complete action" }, 400);

      const playersWithRolls = players.filter((p) => p.roll_off_value !== null);
      if (playersWithRolls.length === 0) return json({ error: "Unable to complete action" }, 400);

      const highestRoll = Math.max(...playersWithRolls.map((p) => p.roll_off_value!));
      const topRollers = playersWithRolls.filter((p) => p.roll_off_value === highestRoll);

      if (topRollers.length > 1) {
        for (const player of topRollers) {
          await supabase.from("players").update({ roll_off_value: null }).eq("id", player.id);
        }
        await supabase.from("games").update({ status: "tie_breaker" }).eq("id", game_id);
        return json({ tie: true });
      }

      const sorted = [...playersWithRolls].sort(
        (a, b) => (b.roll_off_value || 0) - (a.roll_off_value || 0)
      );

      for (let i = 0; i < sorted.length; i++) {
        await supabase
          .from("players")
          .update({
            turn_order: i + 1,
            status: "waiting",
            kept_dice: [],
            rolls_remaining: 5,
            current_score: null,
          })
          .eq("id", sorted[i].id);
      }

      const firstPlayer = sorted[0];
      await supabase.from("players").update({ status: "rolling" }).eq("id", firstPlayer.id);

      const potAmount = players.length * game.bet_amount;
      await supabase
        .from("games")
        .update({ status: "playing", current_player_id: firstPlayer.id, pot: potAmount })
        .eq("id", game_id);

      return json({ success: true });
    }

    // ─── KEEP DICE ───
    if (action === "keep_dice") {
      const { player_id, kept_dice, rolls_remaining } = params;
      if (!isValidUUID(player_id)) return json({ error: "Invalid player_id" }, 400);
      if (!isValidDiceArray(kept_dice)) return json({ error: "Invalid kept_dice (must be array of 0-5 dice values 1-6)" }, 400);
      if (typeof rolls_remaining !== "number" || !Number.isInteger(rolls_remaining) || rolls_remaining < 0 || rolls_remaining > 5) {
        return json({ error: "Invalid rolls_remaining (0-5)" }, 400);
      }

      // Guard: player must be in "rolling" status
      const { data: player } = await supabase.from("players").select("status").eq("id", player_id).single();
      if (!player || player.status !== "rolling") return json({ error: "Unable to complete action" }, 409);

      await supabase
        .from("players")
        .update({ kept_dice, rolls_remaining })
        .eq("id", player_id);
      return json({ success: true });
    }

    // ─── END TURN ───
    if (action === "end_turn") {
      const { player_id, final_dice } = params;
      if (!isValidUUID(player_id)) return json({ error: "Invalid player_id" }, 400);
      if (!game_id) return json({ error: "Missing game_id" }, 400);
      if (!isValidDiceArray(final_dice) || final_dice.length !== 5) {
        return json({ error: "Invalid final_dice (must be exactly 5 dice values 1-6)" }, 400);
      }

      // Guard: player must be in "rolling" status to prevent duplicate end_turn
      const { data: currentPlayerCheck } = await supabase.from("players").select("status").eq("id", player_id).single();
      if (!currentPlayerCheck || currentPlayerCheck.status !== "rolling") return json({ error: "Unable to complete action" }, 409);

      // Guard: game must be in "playing" status
      const { data: gameCheck } = await supabase.from("games").select("status, current_player_id").eq("id", game_id).single();
      if (!gameCheck || gameCheck.status !== "playing" || gameCheck.current_player_id !== player_id) return json({ error: "Unable to complete action" }, 409);

      const score = calculateScore(final_dice);

      await supabase
        .from("players")
        .update({ current_score: score, kept_dice: final_dice, status: "finished" })
        .eq("id", player_id);

      const { data: game } = await supabase.from("games").select("*").eq("id", game_id).single();
      const { data: players } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game_id)
        .order("turn_order", { ascending: true });
      if (!game || !players) return json({ error: "Unable to complete action" }, 500);

      const currentPlayer = players.find((p) => p.id === player_id);
      const currentOrder = currentPlayer?.turn_order || 0;
      const nextPlayer = players.find(
        (p) => (p.turn_order || 0) > currentOrder && p.status === "waiting"
      );

      if (nextPlayer) {
        await supabase.from("players").update({ status: "rolling" }).eq("id", nextPlayer.id);
        await supabase.from("games").update({ current_player_id: nextPlayer.id }).eq("id", game_id);
        return json({ success: true, next_player: nextPlayer.id });
      }

      // Round complete — determine winner
      const finishedPlayers = players.filter(
        (p) => p.status === "finished" && p.current_score !== null
      );
      if (finishedPlayers.length === 0) return json({ error: "Unable to complete action" }, 400);

      const { data: rounds } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("game_id", game_id);
      const roundNumber = (rounds?.length || 0) + 1;

      const lowestScore = Math.min(...finishedPlayers.map((p) => p.current_score!));
      const winners = finishedPlayers.filter((p) => p.current_score === lowestScore);

      if (winners.length > 1) {
        // Push! Record the tied round, double the pot, replay with same order
        await supabase.from("game_rounds").insert({
          game_id,
          round_number: roundNumber,
          was_tie: true,
          pot_amount: game.pot,
        });

        // Everyone antes up again — pot increases
        const newPot = game.pot + players.length * game.bet_amount;

        // Find current first player (lowest turn_order) to preserve turn order
        const firstPlayer = players.reduce((a, b) =>
          (a.turn_order || 999) < (b.turn_order || 999) ? a : b
        );

        // Reset player states for new round but keep turn_order
        for (const player of players) {
          await supabase
            .from("players")
            .update({
              kept_dice: [],
              rolls_remaining: 5,
              current_score: null,
              status: "waiting",
            })
            .eq("id", player.id);
        }

        // Go to between_rounds so host can see the push and start next round
        await supabase
          .from("games")
          .update({ status: "between_rounds", pot: newPot, current_player_id: firstPlayer.id })
          .eq("id", game_id);

        return json({ success: true, tie: true });
      }

      const winner = winners[0];
      const losers = finishedPlayers.filter((p) => p.id !== winner.id);

      // Check how many push rounds preceded this win to calculate total owed per player
      const { data: tieRounds } = await supabase
        .from("game_rounds")
        .select("was_tie")
        .eq("game_id", game_id)
        .eq("was_tie", true);
      const pushCount = tieRounds?.length || 0;
      // Each player owes: bet_amount * (1 + pushCount) — original ante + each push ante
      const perPlayerLoss = game.bet_amount * (1 + pushCount);

      await supabase
        .from("players")
        .update({ total_earnings: (winner.total_earnings || 0) + perPlayerLoss * losers.length })
        .eq("id", winner.id);

      for (const loser of losers) {
        await supabase
          .from("players")
          .update({ total_earnings: (loser.total_earnings || 0) - perPlayerLoss })
          .eq("id", loser.id);
      }

      await supabase.from("game_rounds").insert({
        game_id,
        round_number: roundNumber,
        winner_id: winner.id,
        was_tie: false,
        pot_amount: game.pot,
      });

      await supabase
        .from("games")
        .update({ status: "between_rounds", current_player_id: winner.id })
        .eq("id", game_id);

      return json({ success: true, winner_id: winner.id });
    }

    // ─── START NEXT ROUND (host only) ───
    if (action === "start_next_round") {
      if (!game_id || !session_id) return json({ error: "Missing parameters" }, 400);
      const hostCheck = await verifyHost(supabase, game_id, session_id);
      if (!hostCheck.authorized) return json({ error: hostCheck.error }, 403);

      const { data: game } = await supabase.from("games").select("*").eq("id", game_id).single();
      if (!game) return json({ error: "Unable to complete action" }, 404);
      // Guard: only transition from "between_rounds"
      if (game.status !== "between_rounds") return json({ error: "Unable to complete action" }, 409);

      const startingPlayerId = game.current_player_id;
      if (!startingPlayerId) return json({ error: "Unable to complete action" }, 400);

      const { data: players } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game_id);
      if (!players) return json({ error: "Unable to complete action" }, 400);

      // Check if last round was a tie (push) — if so, keep the accumulated pot
      const { data: lastRounds } = await supabase
        .from("game_rounds")
        .select("was_tie")
        .eq("game_id", game_id)
        .order("round_number", { ascending: false })
        .limit(1);
      const wasPush = lastRounds && lastRounds.length > 0 && lastRounds[0].was_tie;

      for (const player of players) {
        await supabase
          .from("players")
          .update({
            roll_off_value: null,
            kept_dice: [],
            rolls_remaining: 5,
            current_score: null,
            status: "waiting",
            turn_order: null,
          })
          .eq("id", player.id);
      }

      await supabase
        .from("players")
        .update({ turn_order: 1, status: "rolling" })
        .eq("id", startingPlayerId);

      let order = 2;
      for (const player of players.filter((p) => p.id !== startingPlayerId)) {
        await supabase.from("players").update({ turn_order: order }).eq("id", player.id);
        order++;
      }

      // For pushes, keep the accumulated pot; otherwise reset to normal ante
      const newPot = wasPush ? game.pot : players.length * game.bet_amount;

      await supabase
        .from("games")
        .update({
          status: "playing",
          pot: newPot,
          current_player_id: startingPlayerId,
        })
        .eq("id", game_id);

      return json({ success: true });
    }

    // ─── CHANGE BET (host only) ───
    if (action === "change_bet") {
      if (!game_id || !session_id) return json({ error: "Missing parameters" }, 400);
      const hostCheck = await verifyHost(supabase, game_id, session_id);
      if (!hostCheck.authorized) return json({ error: hostCheck.error }, 403);

      const newBet = Math.max(1, Math.min(100, Number(params.bet_amount) || 5));
      await supabase.from("games").update({ bet_amount: newBet }).eq("id", game_id);
      return json({ success: true });
    }

    // ─── END GAME (host only) ───
    if (action === "end_game") {
      if (!game_id || !session_id) return json({ error: "Missing parameters" }, 400);
      const hostCheck = await verifyHost(supabase, game_id, session_id);
      if (!hostCheck.authorized) return json({ error: hostCheck.error }, 403);

      await supabase.from("games").update({ status: "finished" }).eq("id", game_id);
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Game action error:`, err);
    return json({ error: "Internal server error", requestId }, 500);
  }
});
