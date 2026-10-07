import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRole } from "./roles";
export async function getStaffIdentity(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again");
  const db = supabaseAdmin as SupabaseClient;
  const { data: admin, error: roleError } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  return { db, userId: data.user.id, role: resolveRole(!!admin, data.user.app_metadata) };
}
export async function requireStaff(client: SupabaseClient) {
  const identity = await getStaffIdentity(client);
  if (identity.role === "user") throw new Error("Staff access required");
  return identity;
}
