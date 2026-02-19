import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://threesgame.lovable.app",
  "https://id-preview--167792c5-866d-4eb6-8181-13a1774ed253.lovable.app",
  "https://167792c5-866d-4eb6-8181-13a1774ed253.lovableproject.com",
  "http://localhost:8080",
  "http://localhost:5173",
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

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
const ADMIN_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── ADMIN RATE LIMITING ───
const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const ADMIN_MAX_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

function isAdminRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = adminLoginAttempts.get(ip);
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= ADMIN_MAX_ATTEMPTS;
}

function recordAdminAttempt(ip: string): void {
  const now = Date.now();
  const entry = adminLoginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    adminLoginAttempts.set(ip, { count: 1, resetAt: now + ADMIN_LOCKOUT_MS });
  } else {
    entry.count++;
  }
}

function clearAdminAttempts(ip: string): void {
  adminLoginAttempts.delete(ip);
}

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare to avoid timing leak on length difference
    let result = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// HMAC-based admin token helpers
async function createAdminToken(): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const payload = { role: "admin", exp: Date.now() + ADMIN_TOKEN_EXPIRY_MS };
  const payloadB64 = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${payloadB64}.${sigHex}`;
}

async function verifyAdminToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigHex] = parts;
  try {
    const payload = JSON.parse(atob(payloadB64));
    if (payload.role !== "admin" || payload.exp < Date.now()) return false;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, name, pin, security_color } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedName = name.trim().toLowerCase();

    // Validate name length
    if (trimmedName.length > 30) {
      return new Response(
        JSON.stringify({ error: "Name must be 30 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash helper
    async function hashPin(pinVal: string) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pinVal + "_threes_salt_" + trimmedName);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // ─── REGISTER ───
    if (action === "register") {
      if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!security_color || !COLORS.includes(security_color)) {
        return new Response(
          JSON.stringify({ error: "Please select a security color" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabase
        .from("player_accounts")
        .select("id")
        .ilike("name", trimmedName)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Unable to create account. Please try a different name." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pinHash = await hashPin(pin);
      const { data: account, error } = await supabase
        .from("player_accounts")
        .insert({ name: trimmedName, pin_hash: pinHash, security_color })
        .select("id, name")
        .single();

      if (error) {
        console.error("Register error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ account }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── LOGIN ───
    if (action === "login") {
      if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const GENERIC_AUTH_ERROR = "Invalid name or code. Please check your credentials.";

      const { data: account, error } = await supabase
        .from("player_accounts")
        .select("id, name, pin_hash, is_locked")
        .ilike("name", trimmedName)
        .single();

      // Always hash to prevent timing attacks
      const pinHash = await hashPin(pin);

      if (error || !account) {
        return new Response(
          JSON.stringify({ error: GENERIC_AUTH_ERROR }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.is_locked) {
        return new Response(
          JSON.stringify({ error: "Account is locked. Ask the host to reset your account." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If pin_hash is null, account was cleared — need to set new pin
      if (!account.pin_hash) {
        return new Response(
          JSON.stringify({ needs_new_pin: true, account_id: account.id, account_name: account.name }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({ error: GENERIC_AUTH_ERROR }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ account: { id: account.id, name: account.name } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── RESET CODE (verify color, set new pin) ───
    if (action === "reset_code") {
      if (!security_color || !COLORS.includes(security_color)) {
        return new Response(
          JSON.stringify({ error: "Please select your security color" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "New PIN must be exactly 4 digits" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: account, error } = await supabase
        .from("player_accounts")
        .select("id, name, security_color, failed_reset_attempts, is_locked")
        .ilike("name", trimmedName)
        .single();

      if (error || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.is_locked) {
        return new Response(
          JSON.stringify({ error: "Account is locked. Ask the host to reset your account." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.security_color !== security_color) {
        const newAttempts = (account.failed_reset_attempts || 0) + 1;
        const locked = newAttempts >= 2;

        await supabase
          .from("player_accounts")
          .update({ failed_reset_attempts: newAttempts, is_locked: locked })
          .eq("id", account.id);

        if (locked) {
          return new Response(
            JSON.stringify({ error: "Wrong color. Account is now locked. Ask the host to reset it." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Wrong color. You have ${2 - newAttempts} attempt(s) left.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Color matched — set new pin
      const pinHash = await hashPin(pin);
      await supabase
        .from("player_accounts")
        .update({ pin_hash: pinHash, failed_reset_attempts: 0 })
        .eq("id", account.id);

      return new Response(
        JSON.stringify({ account: { id: account.id, name: account.name }, message: "Code updated!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SET NEW PIN (after host clears it) ───
    if (action === "set_new_pin") {
      if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!security_color || !COLORS.includes(security_color)) {
        return new Response(
          JSON.stringify({ error: "Please select a new security color" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: account, error } = await supabase
        .from("player_accounts")
        .select("id, name, pin_hash")
        .ilike("name", trimmedName)
        .single();

      if (error || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.pin_hash) {
        return new Response(
          JSON.stringify({ error: "Account already has a code set. Use login instead." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pinHash = await hashPin(pin);
      await supabase
        .from("player_accounts")
        .update({ pin_hash: pinHash, security_color, failed_reset_attempts: 0, is_locked: false })
        .eq("id", account.id);

      return new Response(
        JSON.stringify({ account: { id: account.id, name: account.name } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ADMIN: CLEAR PIN (host resets a player) ───
    if (action === "admin_clear_pin") {
      if (!(await verifyAdminToken(req.headers.get("authorization")))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: account, error } = await supabase
        .from("player_accounts")
        .select("id, name")
        .ilike("name", trimmedName)
        .single();

      if (error || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("player_accounts")
        .update({ pin_hash: null, failed_reset_attempts: 0, is_locked: false })
        .eq("id", account.id);

      return new Response(
        JSON.stringify({ message: `Account "${account.name}" has been reset. They can set a new code on next login.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ADMIN LOGIN ───
    if (action === "admin_login") {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

      if (isAdminRateLimited(clientIp)) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ADMIN_NAME = Deno.env.get("ADMIN_USERNAME")?.toLowerCase();
      const ADMIN_PIN = Deno.env.get("ADMIN_PIN");
      const GENERIC_ADMIN_ERROR = "Invalid credentials";

      if (!ADMIN_NAME || !ADMIN_PIN) {
        return new Response(
          JSON.stringify({ error: "Admin not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nameMatch = timingSafeEqual(trimmedName, ADMIN_NAME);
      const pinMatch = timingSafeEqual(String(pin || ""), ADMIN_PIN);

      if (!nameMatch || !pinMatch) {
        recordAdminAttempt(clientIp);
        return new Response(
          JSON.stringify({ error: GENERIC_ADMIN_ERROR }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clearAdminAttempts(clientIp);
      const token = await createAdminToken();
      return new Response(
        JSON.stringify({ admin: true, token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ADMIN LIST ACCOUNTS ───
    if (action === "admin_list_accounts") {
      if (!(await verifyAdminToken(req.headers.get("authorization")))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: accounts, error } = await supabase
        .from("player_accounts")
        .select("id, name, is_locked, failed_reset_attempts, created_at, security_color")
        .order("name");

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch accounts" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ accounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ADMIN DELETE ACCOUNT ───
    if (action === "admin_delete_account") {
      if (!(await verifyAdminToken(req.headers.get("authorization")))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: account, error: findErr } = await supabase
        .from("player_accounts")
        .select("id, name")
        .ilike("name", trimmedName)
        .single();

      if (findErr || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove from any active games first
      await supabase.from("players").delete().eq("account_id", account.id);

      const { error: delErr } = await supabase
        .from("player_accounts")
        .delete()
        .eq("id", account.id);

      if (delErr) {
        return new Response(
          JSON.stringify({ error: "Failed to delete account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: `Account "${account.name}" has been deleted.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auth error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
