import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contentSchema, scheduleSchema, defaultContent, defaultSchedule } from "./site-content";
import type { SupabaseClient } from "@supabase/supabase-js";

async function adminClient(client: SupabaseClient) {
  const { data, error } = await client.rpc("is_admin");
  if (error || data !== true) throw new Error("Administrator access required");
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user) throw new Error("Please sign in again");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin as SupabaseClient, userId: identity.user.id };
}
export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as SupabaseClient)
    .from("site_settings")
    .select("content,schedule")
    .eq("id", 1)
    .single();
  if (error) throw new Error("Unable to load court settings");
  return {
    content: contentSchema.parse({ ...defaultContent, ...data.content }),
    schedule: scheduleSchema.parse(data.schedule ?? defaultSchedule),
  };
});
export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .union([z.object({ content: contentSchema }), z.object({ schedule: scheduleSchema })])
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { db } = await adminClient(context.supabase);
    const { error } = await db
      .from("site_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
export const manageUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("create"),
          email: z.string().email(),
          name: z.string().trim().min(1).max(100),
          password: z.string().min(12).max(128),
        }),
        z.object({
          action: z.literal("password"),
          id: z.string().uuid(),
          password: z.string().min(12).max(128),
        }),
        z.object({ action: z.literal("delete"), id: z.string().uuid() }),
      ])
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { db, userId } = await adminClient(context.supabase);
    if (data.action === "create") {
      const { error } = await db.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name },
      });
      if (error) throw error;
    } else {
      const { data: protectedAdmin, error: lookupError } = await db
        .from("admins")
        .select("user_id")
        .eq("user_id", data.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (data.action === "delete") {
        if (data.id === userId || protectedAdmin)
          throw new Error("Administrator accounts cannot be removed here");
        // Ban first so refreshes and verified-user endpoints reject the removed account.
        const { error: banError } = await db.auth.admin.updateUserById(data.id, {
          ban_duration: "876000h",
        });
        if (banError) throw banError;
        const { error } = await db.auth.admin.deleteUser(data.id);
        if (error) throw error;
      } else {
        if (protectedAdmin && data.id !== userId)
          throw new Error("Other administrators must change their own password");
        const { error } = await db.auth.admin.updateUserById(data.id, { password: data.password });
        if (error) throw error;
      }
    }
    return { ok: true };
  });
export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(v),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as SupabaseClient;
    const [bookings, blocks] = await Promise.all([
      db
        .from("bookings")
        .select("date,time,duration")
        .neq("status", "cancelled")
        .gte("date", new Date(Date.parse(data.date) - 86400000).toISOString().slice(0, 10))
        .lte("date", data.date),
      db.from("schedule_blocks").select("time").eq("date", data.date),
    ]);
    if (bookings.error || blocks.error)
      throw new Error("Cannot load availability. Please try again.");
    return {
      bookings: bookings.data ?? [],
      blocked: (blocks.data ?? []).map((b) => b.time as string),
    };
  });
export const setBlockedSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        blocked: z.boolean(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { db } = await adminClient(context.supabase);
    const result = data.blocked
      ? await db.from("schedule_blocks").upsert({ date: data.date, time: data.time })
      : await db.from("schedule_blocks").delete().eq("date", data.date).eq("time", data.time);
    if (result.error) throw result.error;
    return { ok: true };
  });
export const saveAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        duration: z.number().int().min(30).max(240),
        name: z.string().trim().min(2).max(100),
        phone: z.string().min(7).max(30),
        email: z.string().email().or(z.literal("")),
        players: z.number().int().min(1).max(4),
        notes: z.string().max(2000),
        price: z.number().min(0).max(10000),
        payment_method: z.enum(["court", "whish"]),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { db } = await adminClient(context.supabase);
    const { id, ...values } = data;
    const result = id
      ? await db.from("bookings").update(values).eq("id", id)
      : await db
          .from("bookings")
          .insert({
            ...values,
            reference: `PAD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            court_name: "Court 1",
            status: "upcoming",
            payment_status: "unpaid",
          });
    if (result.error) throw result.error;
    return { ok: true };
  });

const bookingKey = z.object({ id: z.string().uuid(), token: z.string().uuid() });
export const cancelGuestBooking = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => bookingKey.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as SupabaseClient)
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("management_token", data.token)
      .eq("status", "upcoming")
      .select("id");
    if (error || !rows?.length)
      throw new Error("Could not cancel this booking. Please contact the court.");
    return { ok: true };
  });
export const getGuestBookings = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.array(bookingKey).max(100).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.length) return [];
    const { data: rows, error } = await (supabaseAdmin as SupabaseClient)
      .from("bookings")
      .select("id,date,time,duration,price,status,management_token")
      .in(
        "id",
        data.map((b) => b.id),
      );
    if (error) throw new Error("Could not refresh bookings");
    return (rows ?? [])
      .filter((b) => data.some((k) => k.id === b.id && k.token === b.management_token))
      .map(({ management_token, ...b }) => b);
  });
