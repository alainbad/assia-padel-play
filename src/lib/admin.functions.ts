import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    return data ?? [];
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
