import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DiceRollEvent {
  dice: number[];
  playerId: string;
  playerName: string;
  isRolling: boolean;
}

export function useDiceBroadcast(roomCode: string | null, myPlayerId: string | null) {
  const [remoteDice, setRemoteDice] = useState<number[]>([]);
  const [remoteIsRolling, setRemoteIsRolling] = useState(false);
  const [remotePlayerName, setRemotePlayerName] = useState<string>("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`dice-roll-${roomCode}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    channel
      .on("broadcast", { event: "dice-roll" }, ({ payload }) => {
        const event = payload as DiceRollEvent;
        // Only update if it's from another player
        if (event.playerId !== myPlayerId) {
          setRemoteDice(event.dice);
          setRemoteIsRolling(event.isRolling);
          setRemotePlayerName(event.playerName);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, myPlayerId]);

  const broadcastDice = useCallback(
    (dice: number[], playerName: string, isRolling: boolean) => {
      if (!channelRef.current || !myPlayerId) return;

      channelRef.current.send({
        type: "broadcast",
        event: "dice-roll",
        payload: {
          dice,
          playerId: myPlayerId,
          playerName,
          isRolling,
        } as DiceRollEvent,
      });
    },
    [myPlayerId]
  );

  const clearRemoteDice = useCallback(() => {
    setRemoteDice([]);
    setRemoteIsRolling(false);
    setRemotePlayerName("");
  }, []);

  return {
    remoteDice,
    remoteIsRolling,
    remotePlayerName,
    broadcastDice,
    clearRemoteDice,
  };
}
