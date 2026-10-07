import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaymentStatus } from "@/lib/bookings";

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getStaffIdentity } = await import("./staff.server");
    const { role, userId } = await getStaffIdentity(context.supabase);
    return { isAdmin: role === "admin", canManage: role !== "user", role, userId };
  });

export const listAllBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaff } = await import("./staff.server");
    const { db } = await requireStaff(context.supabase);
    const { data, error } = await db
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
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["upcoming", "completed", "cancelled"]) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { requireStaff } = await import("./staff.server");
    const { db } = await requireStaff(context.supabase);
    const { error } = await db.from("bookings").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setBookingPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), paymentStatus: z.enum(["unpaid", "deposit", "paid"]) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { requireStaff } = await import("./staff.server");
    const { db } = await requireStaff(context.supabase);
    // See listAllBookings — payment_status isn't in the generated Database
    // types yet, so the client is used untyped for this one call.
    const client = db;
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
  role: import("./roles").SiteRole;
};

export const listRegisteredUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegisteredUser[]> => {
    const { requireStaff } = await import("./staff.server");
    const { db } = await requireStaff(context.supabase);
    // Listing every Supabase Auth user requires the service-role admin API,
    // which the regular (RLS-bound) client can't do. Import the service-role
    // client dynamically here so it's never bundled into client-shipped code
    // — see the warning in client.server.ts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const users = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 200) break;
    }
    const { data: admins, error: adminError } = await db.from("admins").select("user_id");
    if (adminError) throw adminError;
    const { resolveRole } = await import("./roles");
    return users.map((u) => {
      const metadata = (u.user_metadata ?? {}) as Record<string, unknown>;
      const identifierType = metadata["signup_identifier_type"];
      const identifier = metadata["signup_identifier"];
      const name = typeof metadata["full_name"] === "string" ? metadata["full_name"] : null;
      const isPhoneSignup = identifierType === "phone" && typeof identifier === "string";
      return {
        id: u.id,
        role: resolveRole(
          (admins ?? []).some((a) => a.user_id === u.id),
          u.app_metadata,
        ),
        name,
        email: isPhoneSignup ? null : (u.email ?? null),
        phone: isPhoneSignup ? (identifier as string) : null,
        createdAt: u.created_at,
      };
    });
  });
