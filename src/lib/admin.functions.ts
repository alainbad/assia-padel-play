import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaymentStatus } from "@/lib/bookings";

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_admin");
    if (error) throw error;
    return { isAdmin: data === true, userId: context.userId };
  });

export const listAllBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) throw new Error("Not authorized");
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    if (error) throw error;
    // payment_status was added via a migration that runs after the
    // generated Database types were last generated, so it isn't in the
    // typed Row yet — the column exists at runtime once the migration has
    // been applied. Widen the type here rather than hand-editing types.ts.
    return (data ?? []) as (NonNullable<typeof data>[number] & { payment_status: PaymentStatus })[];
  });

export const setBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "upcoming" | "completed" | "cancelled" }) => data)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) throw new Error("Not authorized");
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setBookingPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; paymentStatus: PaymentStatus }) => data)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) throw new Error("Not authorized");
    // See listAllBookings — payment_status isn't in the generated Database
    // types yet, so the client is used untyped for this one call.
    const client = context.supabase as unknown as SupabaseClient;
    const { error } = await client
      .from("bookings")
      .update({ payment_status: data.paymentStatus })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export type RegisteredUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export const listRegisteredUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegisteredUser[]> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) throw new Error("Not authorized");
    // Listing every Supabase Auth user requires the service-role admin API,
    // which the regular (RLS-bound) client can't do. Import the service-role
    // client dynamically here so it's never bundled into client-shipped code
    // — see the warning in client.server.ts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;
    return data.users.map((u) => {
      const metadata = (u.user_metadata ?? {}) as Record<string, unknown>;
      const identifierType = metadata["signup_identifier_type"];
      const identifier = metadata["signup_identifier"];
      const name = typeof metadata["full_name"] === "string" ? metadata["full_name"] : null;
      const isPhoneSignup = identifierType === "phone" && typeof identifier === "string";
      return {
        id: u.id,
        name,
        email: isPhoneSignup ? null : (u.email ?? null),
        phone: isPhoneSignup ? (identifier as string) : null,
        createdAt: u.created_at,
      };
    });
  });
