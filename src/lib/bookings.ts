import { isSupabaseConfigured, requireSupabase } from "./supabase";

const MY_BOOKINGS_KEY = "assia-padel-my-bookings-v2";

export type Booking = {
  id: string;
  reference: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // "20:00"
  duration: number; // minutes
  name: string;
  phone: string;
  email?: string;
  players: number;
  notes?: string;
  price: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  courtName: string;
  status: "upcoming" | "completed" | "cancelled";
};

export type PaymentMethod = "court" | "whish";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string }[] = [
  { id: "court", label: "Pay at the court", description: "Cash or card when you arrive." },
  {
    id: "whish",
    label: "Pay by Whish",
    description: "Send the amount via Whish Money before your slot.",
  },
];

export const WHISH_NUMBER = "+961 71 234 567";

export function paymentLabel(method: PaymentMethod | undefined): string {
  return method === "whish" ? "Pay by Whish" : "Pay at the court";
}

export type SlotStatus = "available" | "booked" | "selected" | "past";

export type TimeSlot = {
  time: string;
  label: string;
  duration: number;
  price: number;
  period: "morning" | "afternoon" | "evening";
};

export const SLOT_DURATION = 90;
export const COURT_NAME = "Court 1";
export const COURT_PRICE_DAY = 25;
export const COURT_PRICE_EVENING = 35;

export const ALL_SLOTS: TimeSlot[] = [
  {
    time: "08:00",
    label: "8:00 AM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "morning",
  },
  {
    time: "09:30",
    label: "9:30 AM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "morning",
  },
  {
    time: "11:00",
    label: "11:00 AM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "morning",
  },
  {
    time: "12:30",
    label: "12:30 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "afternoon",
  },
  {
    time: "14:00",
    label: "2:00 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "afternoon",
  },
  {
    time: "15:30",
    label: "3:30 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "afternoon",
  },
  {
    time: "17:00",
    label: "5:00 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_DAY,
    period: "afternoon",
  },
  {
    time: "18:30",
    label: "6:30 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_EVENING,
    period: "evening",
  },
  {
    time: "20:00",
    label: "8:00 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_EVENING,
    period: "evening",
  },
  {
    time: "21:30",
    label: "9:30 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_EVENING,
    period: "evening",
  },
  {
    time: "23:00",
    label: "11:00 PM",
    duration: SLOT_DURATION,
    price: COURT_PRICE_EVENING,
    period: "evening",
  },
];

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PAD-${result}`;
}

// ── row <-> Booking mapping ────────────────────────────────────────────

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

// ── "my bookings" local cache (this device only, no login for customers) ─

function loadMyBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_BOOKINGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
}

function saveMyBookings(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MY_BOOKINGS_KEY, JSON.stringify(bookings));
}

function rememberMyBooking(booking: Booking): void {
  const bookings = loadMyBookings().filter((b) => b.id !== booking.id);
  bookings.push(booking);
  saveMyBookings(bookings);
}

/** Re-checks each locally cached booking against the server, so cancellations
 * made elsewhere (e.g. by the admin) show up here too. */
export async function refreshMyBookings(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const cached = loadMyBookings();
  if (cached.length === 0) return;
  const client = requireSupabase();
  const updated = await Promise.all(
    cached.map(async (b) => {
      const { data } = await client.rpc("get_booking_by_reference", {
        p_id: b.id,
        p_reference: b.reference,
      });
      const row = (data as BookingRow[] | null)?.[0];
      return row ? rowToBooking(row) : b;
    }),
  );
  saveMyBookings(updated);
}

// ── booking creation / cancellation ─────────────────────────────────────

export class SlotUnavailableError extends Error {
  constructor() {
    super("This slot was just booked by someone else. Please pick another time.");
    this.name = "SlotUnavailableError";
  }
}

export async function addBooking(
  booking: Omit<Booking, "id" | "reference" | "createdAt" | "status" | "email" | "notes"> & {
    email?: string;
    notes?: string;
  },
): Promise<Booking> {
  const client = requireSupabase();
  const reference = generateReference();
  const { data, error } = await client
    .from("bookings")
    .insert({
      reference,
      date: booking.date,
      time: booking.time,
      duration: booking.duration,
      name: booking.name,
      phone: booking.phone,
      email: booking.email ?? null,
      players: booking.players,
      notes: booking.notes ?? null,
      price: booking.price,
      payment_method: booking.paymentMethod,
      court_name: booking.courtName,
      status: "upcoming",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new SlotUnavailableError();
    throw new Error(error.message);
  }

  const newBooking = rowToBooking(data as BookingRow);
  rememberMyBooking(newBooking);
  return newBooking;
}

export async function cancelBooking(id: string, reference: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("cancel_booking_by_reference", {
    p_id: id,
    p_reference: reference,
  });
  if (error) throw new Error(error.message);
  const bookings = loadMyBookings().map((b) =>
    b.id === id ? { ...b, status: "cancelled" as const } : b,
  );
  saveMyBookings(bookings);
}

// ── availability ─────────────────────────────────────────────────────

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function generateDayOptions(
  count = 14,
): { date: Date; key: string; label: string; sublabel: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const key = formatDateKey(date);
    const dayNames: readonly string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months: readonly string[] = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    let label: string;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tomorrow";
    else label = dayNames[date.getDay()] ?? "";
    options.push({ date, key, label, sublabel: `${date.getDate()} ${months[date.getMonth()]}` });
  }
  return options;
}

export function getSlotPrice(slot: TimeSlot): number {
  return slot.price;
}

export function isSlotPast(dateKey: string, time: string): boolean {
  const now = new Date();
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  const slotDate = new Date(`${dateKey}T${pad(hours)}:${pad(minutes)}:00`);
  return slotDate.getTime() < now.getTime();
}

/** Booked times for a date, fetched from the server (shared across every device). */
export async function getBookedSlotsForDate(dateKey: string): Promise<Set<string>> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_booked_times", { p_date: dateKey });
  if (error) throw new Error(error.message);
  return new Set((data as { time: string }[] | null)?.map((r) => r.time) ?? []);
}

export function getSlotStatus(
  dateKey: string,
  time: string,
  bookedSet: Set<string>,
  selectedTime?: string,
): SlotStatus {
  if (selectedTime === time) return "selected";
  if (isSlotPast(dateKey, time)) return "past";
  if (bookedSet.has(time)) return "booked";
  return "available";
}

export async function getAvailableSlotsForDate(dateKey: string): Promise<TimeSlot[]> {
  const booked = await getBookedSlotsForDate(dateKey);
  return ALL_SLOTS.filter((s) => !isSlotPast(dateKey, s.time) && !booked.has(s.time));
}

export function formatDisplayDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", { day: "numeric", month: "long" });
  if (diff === 0) return `Today, ${dateStr}`;
  if (diff === 1) return `Tomorrow, ${dateStr}`;
  return `${dayName}, ${dateStr}`;
}

export function getSlotEndTime(startTime: string, durationMinutes: number): string {
  const parts = startTime.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  const end = new Date();
  end.setHours(hours, minutes + durationMinutes, 0, 0);
  return `${end.getHours() % 12 || 12}:${pad(end.getMinutes())} ${end.getHours() >= 12 ? "PM" : "AM"}`;
}

export function formatTime12h(time: string): string {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${pad(minutes)} ${ampm}`;
}

export function getBookingsByStatus(): { upcoming: Booking[]; previous: Booking[] } {
  const bookings = loadMyBookings().filter((b) => b.status !== "cancelled");
  const now = new Date().getTime();
  const upcoming: Booking[] = [];
  const previous: Booking[] = [];
  for (const b of bookings) {
    const parts = b.time.split(":");
    const hours = parseInt(parts[0] ?? "0", 10);
    const minutes = parseInt(parts[1] ?? "0", 10);
    const start = new Date(`${b.date}T${pad(hours)}:${pad(minutes)}:00`).getTime();
    if (start >= now) {
      upcoming.push(b);
    } else {
      previous.push({ ...b, status: "completed" });
    }
  }
  upcoming.sort(
    (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime(),
  );
  previous.sort(
    (a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime(),
  );
  return { upcoming, previous };
}
