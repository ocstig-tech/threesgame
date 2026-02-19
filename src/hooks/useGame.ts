import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rollDice, calculateScore } from "@/lib/gameUtils";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"];
type GameRound = Database["public"]["Tables"]["game_rounds"]["Row"];

export interface GameState {
  game: Game | null;
  players: Player[];
  currentPlayer: Player | null;
  myPlayer: Player | null;
  rounds: GameRound[];
  isLoading: boolean;
  error: string | null;
}

async function callGameAction(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("game-actions", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Request failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useGame(roomCode: string | null) {
  const [state, setState] = useState<GameState>({
    game: null,
    players: [],
    currentPlayer: null,
    myPlayer: null,
    rounds: [],
    isLoading: true,
    error: null,
  });

  // Use account ID as session identifier
  const getAccountId = (): string => {
    try {
      const stored = localStorage.getItem("threes_account");
      if (stored) {
        const acc = JSON.parse(stored);
        return acc.id;
      }
    } catch {}
    // Fallback to legacy session ID
    const key = "threes_session_id";
    let sid = localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(key, sid);
    }
    return sid;
  };
  const sessionId = getAccountId();

  // Fetch game and players (reads are still direct via RLS SELECT policies)
  const fetchGame = useCallback(async () => {
    if (!roomCode) return;

    try {
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .single();

      if (gameError) throw gameError;

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game.id)
        .order("turn_order", { ascending: true, nullsFirst: false });

      if (playersError) throw playersError;

      const { data: rounds, error: roundsError } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("game_id", game.id)
        .order("round_number", { ascending: true });

      if (roundsError) throw roundsError;

      const myPlayer = players.find((p) => p.session_id === sessionId) || null;
      const currentPlayer =
        players.find((p) => p.id === game.current_player_id) || null;

      setState({
        game,
        players,
        currentPlayer,
        myPlayer,
        rounds: rounds || [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch game",
      }));
    }
  }, [roomCode, sessionId]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!roomCode) return;

    fetchGame();

    const channel = supabase
      .channel(`game-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        () => fetchGame()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => fetchGame()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rounds" },
        () => fetchGame()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, fetchGame]);

  // Create a new game
  const createGame = async (hostName: string, betAmount: number) => {
    const data = await callGameAction("create_game", {
      host_name: hostName,
      bet_amount: betAmount,
      session_id: sessionId,
      account_id: sessionId,
    });
    return data.room_code as string;
  };

  // Join an existing game
  const joinGame = async (code: string, playerName: string) => {
    const data = await callGameAction("join_game", {
      room_code: code,
      player_name: playerName,
      session_id: sessionId,
      account_id: sessionId,
    });
    return data.room_code as string;
  };

  // Start roll-off phase
  const startRollOff = async () => {
    if (!state.game) return;
    await callGameAction("start_roll_off", { game_id: state.game.id, session_id: sessionId });
  };

  // Roll for turn order
  const rollForTurnOrder = async () => {
    if (!state.game || !state.myPlayer) return;
    await callGameAction("roll_for_turn_order", { player_id: state.myPlayer.id });
  };

  // Start the game (after roll-off complete)
  const startGame = async () => {
    if (!state.game) return;
    await callGameAction("start_game", { game_id: state.game.id, session_id: sessionId });
  };

  // Roll dice for current turn (client-side only, no DB write)
  const rollDiceForTurn = async (keptIndices: number[], currentDice: number[]) => {
    if (!state.myPlayer) return null;

    const newDice = currentDice.map((die, i) =>
      keptIndices.includes(i) ? die : rollDice(1)[0]
    );

    return newDice;
  };

  // Keep dice and update player state
  const keepDice = async (keptDice: number[], rollsRemaining: number) => {
    if (!state.myPlayer) return;
    await callGameAction("keep_dice", {
      player_id: state.myPlayer.id,
      kept_dice: keptDice,
      rolls_remaining: rollsRemaining,
    });
  };

  // End turn (player finished their rolls)
  const endTurn = async (finalDice: number[]) => {
    if (!state.game || !state.myPlayer) return;
    await callGameAction("end_turn", {
      game_id: state.game.id,
      player_id: state.myPlayer.id,
      final_dice: finalDice,
    });
  };

  // Start next round after a winner has been determined
  const startNextRound = async () => {
    if (!state.game) return;
    await callGameAction("start_next_round", { game_id: state.game.id, session_id: sessionId });
  };

  // Change bet amount (host only, between rounds)
  const changeBet = async (newBet: number) => {
    if (!state.game) return;
    await callGameAction("change_bet", { game_id: state.game.id, bet_amount: newBet, session_id: sessionId });
  };

  // End the game session
  const endGame = async () => {
    if (!state.game) return;
    await callGameAction("end_game", { game_id: state.game.id, session_id: sessionId });
  };

  return {
    ...state,
    sessionId,
    createGame,
    joinGame,
    startRollOff,
    rollForTurnOrder,
    startGame,
    startNextRound,
    changeBet,
    rollDiceForTurn,
    keepDice,
    endTurn,
    endGame,
    refresh: fetchGame,
  };
}
