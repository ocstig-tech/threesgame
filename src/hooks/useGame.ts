import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId, rollDice, calculateScore } from "@/lib/gameUtils";
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

  const sessionId = getSessionId();

  // Fetch game and players
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
  const createGame = async (hostName: string, betAmount: number, phoneNumber?: string) => {
    const { generateRoomCode } = await import("@/lib/gameUtils");
    const newRoomCode = generateRoomCode();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        room_code: newRoomCode,
        host_name: hostName,
        bet_amount: betAmount,
      })
      .select()
      .single();

    if (gameError) throw gameError;

    // Add host as first player
    const { error: playerError } = await supabase.from("players").insert({
      game_id: game.id,
      name: hostName,
      session_id: sessionId,
      phone_number: phoneNumber || null,
    });

    if (playerError) throw playerError;

    return newRoomCode;
  };

  // Join an existing game
  const joinGame = async (code: string, playerName: string, phoneNumber?: string) => {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("room_code", code.toUpperCase())
      .single();

    if (gameError) throw new Error("Game not found");

    // Check if player already exists
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", game.id)
      .eq("session_id", sessionId)
      .single();

    if (existingPlayer) {
      return code.toUpperCase();
    }

    const { error: playerError } = await supabase.from("players").insert({
      game_id: game.id,
      name: playerName,
      session_id: sessionId,
      phone_number: phoneNumber || null,
    });

    if (playerError) throw playerError;

    return code.toUpperCase();
  };

  // Start roll-off phase
  const startRollOff = async () => {
    if (!state.game) return;

    await supabase
      .from("games")
      .update({ status: "roll_off" })
      .eq("id", state.game.id);
  };

  // Roll for turn order
  const rollForTurnOrder = async () => {
    if (!state.game || !state.myPlayer) return;

    const [rollValue] = rollDice(1);

    await supabase
      .from("players")
      .update({ roll_off_value: rollValue })
      .eq("id", state.myPlayer.id);
  };

  // Start the game (after roll-off complete)
  const startGame = async () => {
    if (!state.game) return;

    // Sort players by roll-off value (highest first)
    const sortedPlayers = [...state.players]
      .filter((p) => p.roll_off_value !== null)
      .sort((a, b) => (b.roll_off_value || 0) - (a.roll_off_value || 0));

    // Assign turn order
    for (let i = 0; i < sortedPlayers.length; i++) {
      await supabase
        .from("players")
        .update({ 
          turn_order: i + 1,
          status: "waiting",
          kept_dice: [],
          rolls_remaining: 5,
          current_score: null,
        })
        .eq("id", sortedPlayers[i].id);
    }

    // Set first player and start game
    const firstPlayer = sortedPlayers[0];
    await supabase
      .from("players")
      .update({ status: "rolling" })
      .eq("id", firstPlayer.id);

    // Add bet to pot
    const potAmount = state.players.length * state.game.bet_amount;

    await supabase
      .from("games")
      .update({
        status: "playing",
        current_player_id: firstPlayer.id,
        pot: potAmount,
      })
      .eq("id", state.game.id);
  };

  // Roll dice for current turn
  const rollDiceForTurn = async (keptIndices: number[], currentDice: number[]) => {
    if (!state.myPlayer) return null;

    // Roll new dice for non-kept positions
    const newDice = currentDice.map((die, i) =>
      keptIndices.includes(i) ? die : rollDice(1)[0]
    );

    return newDice;
  };

  // Keep dice and update player state
  const keepDice = async (keptDice: number[], rollsRemaining: number) => {
    if (!state.myPlayer) return;

    await supabase
      .from("players")
      .update({
        kept_dice: keptDice,
        rolls_remaining: rollsRemaining,
      })
      .eq("id", state.myPlayer.id);
  };

  // End turn (player finished their rolls)
  const endTurn = async (finalDice: number[]) => {
    if (!state.game || !state.myPlayer) return;

    const score = calculateScore(finalDice);

    await supabase
      .from("players")
      .update({
        current_score: score,
        kept_dice: finalDice,
        status: "finished",
      })
      .eq("id", state.myPlayer.id);

    // Find next player
    const currentOrder = state.myPlayer.turn_order || 0;
    const nextPlayer = state.players.find(
      (p) => (p.turn_order || 0) > currentOrder && p.status === "waiting"
    );

    if (nextPlayer) {
      // Move to next player
      await supabase
        .from("players")
        .update({ status: "rolling" })
        .eq("id", nextPlayer.id);

      await supabase
        .from("games")
        .update({ current_player_id: nextPlayer.id })
        .eq("id", state.game.id);
    } else {
      // Round complete - determine winner
      await determineWinner();
    }
  };

  // Determine round winner
  const determineWinner = async () => {
    if (!state.game) return;

    const finishedPlayers = state.players.filter(
      (p) => p.status === "finished" && p.current_score !== null
    );

    if (finishedPlayers.length === 0) return;

    // Find lowest score
    const lowestScore = Math.min(
      ...finishedPlayers.map((p) => p.current_score!)
    );
    const winners = finishedPlayers.filter(
      (p) => p.current_score === lowestScore
    );

    const roundNumber = state.rounds.length + 1;

    if (winners.length > 1) {
      // Tie! Add to pot and restart
      await supabase.from("game_rounds").insert({
        game_id: state.game.id,
        round_number: roundNumber,
        was_tie: true,
        pot_amount: state.game.pot,
      });

      // Add another bet from each player to pot
      const newPot = state.game.pot + state.players.length * state.game.bet_amount;

      // Reset all players for new round
      for (const player of state.players) {
        await supabase
          .from("players")
          .update({
            roll_off_value: null,
            kept_dice: [],
            rolls_remaining: 5,
            current_score: null,
            status: "waiting",
          })
          .eq("id", player.id);
      }

      await supabase
        .from("games")
        .update({
          status: "tie_breaker",
          pot: newPot,
          current_player_id: null,
        })
        .eq("id", state.game.id);
    } else {
      // We have a winner!
      const winner = winners[0];
      const losers = finishedPlayers.filter((p) => p.id !== winner.id);

      // Update earnings
      // Winner takes the whole pot, but they've also contributed their share.
      // Net profit = pot - (pot / players). Each loser loses their share.
      const stakePerPlayer = Math.round(state.game.pot / Math.max(state.players.length, 1));
      const winAmount = state.game.pot - stakePerPlayer;
      await supabase
        .from("players")
        .update({ total_earnings: (winner.total_earnings || 0) + winAmount })
        .eq("id", winner.id);

      for (const loser of losers) {
        await supabase
          .from("players")
          .update({
            total_earnings: (loser.total_earnings || 0) - stakePerPlayer,
          })
          .eq("id", loser.id);
      }

      // Record round
      await supabase.from("game_rounds").insert({
        game_id: state.game.id,
        round_number: roundNumber,
        winner_id: winner.id,
        was_tie: false,
        pot_amount: state.game.pot,
      });

      // Pause after the round and let the host start the next round.
      const BETWEEN_ROUNDS = "between_rounds" as unknown as Game["status"];
      await supabase
        .from("games")
        .update({
          status: BETWEEN_ROUNDS,
          // Store who starts next round (winner goes first)
          current_player_id: winner.id,
        })
        .eq("id", state.game.id);
    }
  };

  // Start next round after a winner has been determined
  const startNextRound = async () => {
    if (!state.game) return;

    const startingPlayerId = state.game.current_player_id;
    if (!startingPlayerId) return;

    // Reset all players for new round
    for (const player of state.players) {
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

    // Winner rolls first, assign turn order
    await supabase
      .from("players")
      .update({ turn_order: 1, status: "rolling" })
      .eq("id", startingPlayerId);

    let order = 2;
    for (const player of state.players.filter((p) => p.id !== startingPlayerId)) {
      await supabase
        .from("players")
        .update({ turn_order: order })
        .eq("id", player.id);
      order++;
    }

    await supabase
      .from("games")
      .update({
        status: "playing",
        pot: state.players.length * state.game.bet_amount,
        current_player_id: startingPlayerId,
      })
      .eq("id", state.game.id);
  };

  // End the game session
  const endGame = async () => {
    if (!state.game) return;

    await supabase
      .from("games")
      .update({ status: "finished" })
      .eq("id", state.game.id);
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
    rollDiceForTurn,
    keepDice,
    endTurn,
    endGame,
    refresh: fetchGame,
  };
}
