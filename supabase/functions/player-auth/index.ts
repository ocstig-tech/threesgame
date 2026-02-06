import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, name, pin } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be exactly 4 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedName = name.trim().toLowerCase();

    // Simple hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "_threes_salt_" + trimmedName);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const pinHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (action === "register") {
      // Check if name already taken
      const { data: existing } = await supabase
        .from("player_accounts")
        .select("id")
        .ilike("name", trimmedName)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Name already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: account, error } = await supabase
        .from("player_accounts")
        .insert({ name: trimmedName, pin_hash: pinHash })
        .select("id, name")
        .single();

      if (error) {
        console.error("Register error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Account registered:", account.name);
      return new Response(
        JSON.stringify({ account }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login") {
      const { data: account, error } = await supabase
        .from("player_accounts")
        .select("id, name, pin_hash")
        .ilike("name", trimmedName)
        .single();

      if (error || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (account.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({ error: "Incorrect PIN" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Account logged in:", account.name);
      return new Response(
        JSON.stringify({ account: { id: account.id, name: account.name } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'register' or 'login'" }),
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
