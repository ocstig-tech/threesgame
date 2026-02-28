import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerAccount {
  id: string;
  name: string;
}

const STORAGE_KEY = "threes_account";
const TIMESTAMP_KEY = "threes_account_ts";
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

function isSessionExpired(): boolean {
  const ts = localStorage.getItem(TIMESTAMP_KEY);
  if (!ts) return true;
  return Date.now() - Number(ts) > SESSION_TIMEOUT_MS;
}

function touchSession() {
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

export function usePlayerAccount() {
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionExpired()) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setAccount(JSON.parse(stored));
          touchSession();
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TIMESTAMP_KEY);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const register = async (name: string, pin: string, security_color: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "register", name, pin, security_color },
    });

    if (error) throw new Error("Failed to register");
    if (data.error) throw new Error(data.error);

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    touchSession();
    setAccount(acc);
    return acc;
  };

  const login = async (name: string, pin: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "login", name, pin },
    });

    if (error) throw new Error("Failed to login");
    if (data?.error) throw new Error(data.error);

    // Account was cleared by host — needs new pin
    if (data?.needs_new_pin) {
      return { needs_new_pin: true, account_id: data.account_id, account_name: data.account_name };
    }

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    touchSession();
    setAccount(acc);
    return acc;
  };

  const resetCode = async (name: string, security_color: string, newPin: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "reset_code", name, pin: newPin, security_color },
    });

    if (error) throw new Error("Failed to reset code");
    if (data?.error) throw new Error(data.error);

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    touchSession();
    setAccount(acc);
    return acc;
  };

  const setNewPin = async (name: string, pin: string, security_color: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "set_new_pin", name, pin, security_color },
    });

    if (error) throw new Error("Failed to set new code");
    if (data?.error) throw new Error(data.error);

    const acc: PlayerAccount = data.account;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    touchSession();
    setAccount(acc);
    return acc;
  };

  const adminClearPin = async (name: string) => {
    const { data, error } = await supabase.functions.invoke("player-auth", {
      body: { action: "admin_clear_pin", name, pin: "0000" },
    });

    if (error) throw new Error("Failed to clear account");
    if (data?.error) throw new Error(data.error);

    return data.message;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    setAccount(null);
  };

  return { account, isLoading, register, login, logout, resetCode, setNewPin, adminClearPin };
}
