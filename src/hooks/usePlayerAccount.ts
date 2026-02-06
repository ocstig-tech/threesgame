import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerAccount {
  id: string;
  name: string;
}

const STORAGE_KEY = "threes_account";

export function usePlayerAccount() {
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAccount(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const register = async (name: string, pin: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "register", name, pin },
    });

    if (error) throw new Error("Failed to register");
    if (data.error) throw new Error(data.error);

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    setAccount(acc);
    return acc;
  };

  const login = async (name: string, pin: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "login", name, pin },
    });

    if (error) throw new Error("Failed to login");
    if (data.error) throw new Error(data.error);

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    setAccount(acc);
    return acc;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccount(null);
  };

  return { account, isLoading, register, login, logout };
}
