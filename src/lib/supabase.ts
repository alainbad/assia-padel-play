import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as generatedClient } from "@/integrations/supabase/client";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

// src/integrations/supabase/types.ts is auto-generated from the live schema
// and starts out empty, so its `Database` generic doesn't know about the
// bookings/admins tables or RPCs from supabase/migrations yet. Use the
// client untyped here rather than hand-editing that generated file; once
// Lovable regenerates it after the migration runs, callers can switch back
// to the typed client if desired.
//
// Lovable Cloud's generated client is a Proxy that only throws once a
// property is actually accessed, so it's safe to re-export directly —
// callers should still check isSupabaseConfigured (or go through
// requireSupabase) before using it.
export const supabase = isSupabaseConfigured
  ? (generatedClient as unknown as SupabaseClient)
  : null;

export function requireSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Connect Supabase in Lovable Cloud, or set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return generatedClient as unknown as SupabaseClient;
}
