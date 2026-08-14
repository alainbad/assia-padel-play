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
