import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "@/hooks/useGame";
import { GameLobby } from "@/components/game/GameLobby";
import { GamePlay } from "@/components/game/GamePlay";
import { Settlement } from "@/components/game/Settlement";
import { Loader2 } from "lucide-react";

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const {
    game,
    players,
    currentPlayer,
    myPlayer,
    rounds,
    isLoading,
    error,
    startRollOff,
    rollForTurnOrder,
    startGame,
    startNextRound,
    rollDiceForTurn,
    keepDice,
    endTurn,
    endGame,
  } = useGame(roomCode || null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Game not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="text-primary underline"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isHost = players.length > 0 && players[0]?.session_id === myPlayer?.session_id;

  // Game finished - show settlement
  if (game.status === "finished") {
    return (
      <Settlement
        players={players}
        rounds={rounds}
        betAmount={game.bet_amount}
        onNewGame={() => navigate("/")}
        onGoHome={() => navigate("/")}
      />
    );
  }

  // Lobby / Roll-off / Tie-breaker
  if (game.status === "waiting" || game.status === "roll_off" || game.status === "tie_breaker") {
    return (
      <GameLobby
        game={game}
        players={players}
        myPlayer={myPlayer}
        isHost={isHost}
        onStartRollOff={startRollOff}
        onRollForTurn={rollForTurnOrder}
        onStartGame={startGame}
      />
    );
  }

  // Active gameplay
  return (
    <GamePlay
      game={game}
      players={players}
      currentPlayer={currentPlayer}
      myPlayer={myPlayer}
      onRollDice={rollDiceForTurn}
      onKeepDice={keepDice}
      onEndTurn={endTurn}
      onStartNextRound={startNextRound}
      onEndGame={endGame}
    />
  );
}
