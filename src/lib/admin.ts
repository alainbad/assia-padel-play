import type { Session } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";
import type { Booking, PaymentMethod } from "./bookings";

type BookingRow = {
  id: string;
  reference: string;
  date: string;
  time: string;
  duration: number;
  name: string;
  phone: string;
  email: string | null;
  players: number;
  notes: string | null;
  price: number;
  payment_method: PaymentMethod;
  court_name: string;
  status: Booking["status"];
  created_at: string;
};

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    reference: row.reference,
    date: row.date,
    time: row.time,
    duration: row.duration,
    name: row.name,
    phone: row.phone,
    ...(row.email ? { email: row.email } : {}),
    players: row.players,
    ...(row.notes ? { notes: row.notes } : {}),
    price: row.price,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    courtName: row.court_name,
    status: row.status,
  };
}

export class NotAdminError extends Error {
  constructor() {
    super("This account does not have admin access.");
    this.name = "NotAdminError";
  }
}

export async function adminSignIn(email: string, password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    await client.auth.signOut();
    throw new NotAdminError();
  }
}

export async function adminSignOut(): Promise<void> {
  const client = requireSupabase();
  await client.auth.signOut();
}

export async function checkIsAdmin(): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export async function getAdminSession(): Promise<Session | null> {
  const client = requireSupabase();
  const { data } = await client.auth.getSession();
  return data.session;
}

export function onAdminAuthStateChange(callback: (session: Session | null) => void) {
  const client = requireSupabase();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

export async function listAllBookings(): Promise<Booking[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as BookingRow[]).map(rowToBooking);
}

export async function adminSetBookingStatus(id: string, status: Booking["status"]): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
