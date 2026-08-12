const STORAGE_KEY = "assia-padel-bookings-v1";

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
  { id: "whish", label: "Pay by Whish", description: "Send the amount via Whish Money before your slot." },
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
  { time: "08:00", label: "8:00 AM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "morning" },
  { time: "09:30", label: "9:30 AM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "morning" },
  { time: "11:00", label: "11:00 AM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "morning" },
  { time: "12:30", label: "12:30 PM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "afternoon" },
  { time: "14:00", label: "2:00 PM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "afternoon" },
  { time: "15:30", label: "3:30 PM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "afternoon" },
  { time: "17:00", label: "5:00 PM", duration: SLOT_DURATION, price: COURT_PRICE_DAY, period: "afternoon" },
  { time: "18:30", label: "6:30 PM", duration: SLOT_DURATION, price: COURT_PRICE_EVENING, period: "evening" },
  { time: "20:00", label: "8:00 PM", duration: SLOT_DURATION, price: COURT_PRICE_EVENING, period: "evening" },
  { time: "21:30", label: "9:30 PM", duration: SLOT_DURATION, price: COURT_PRICE_EVENING, period: "evening" },
  { time: "23:00", label: "11:00 PM", duration: SLOT_DURATION, price: COURT_PRICE_EVENING, period: "evening" },
];

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PAD-${result}`;
}

export function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    return parsed.filter((b) => b.status !== "cancelled");
  } catch {
    return [];
  }
}

export function saveBookings(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function addBooking(booking: Omit<Booking, "id" | "reference" | "createdAt" | "status" | "email" | "notes"> & { email?: string; notes?: string }): Booking {
  const newBooking: Booking = {
    ...booking,
    id: crypto.randomUUID(),
    reference: generateReference(),
    createdAt: new Date().toISOString(),
    status: "upcoming",
  };
  const bookings = loadBookings();
  bookings.push(newBooking);
  saveBookings(bookings);
  return newBooking;
}

export function cancelBooking(id: string): void {
  const bookings = loadBookings().map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b));
  saveBookings(bookings);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function generateDayOptions(count = 14): { date: Date; key: string; label: string; sublabel: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const key = formatDateKey(date);
    const dayNames: readonly string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months: readonly string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

export function getBookedSlotsForDate(dateKey: string): Set<string> {
  const bookings = loadBookings();
  const booked = new Set<string>();
  for (const b of bookings) {
    if (b.date === dateKey && b.status !== "cancelled") {
      booked.add(b.time);
    }
  }
  return booked;
}

export function getSlotStatus(dateKey: string, time: string, selectedTime?: string): SlotStatus {
  if (selectedTime === time) return "selected";
  if (isSlotPast(dateKey, time)) return "past";
  const booked = getBookedSlotsForDate(dateKey);
  if (booked.has(time)) return "booked";
  return "available";
}

export function getAvailableSlotsForDate(dateKey: string): TimeSlot[] {
  const booked = getBookedSlotsForDate(dateKey);
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
  const bookings = loadBookings().filter((b) => b.status !== "cancelled");
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
  upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  previous.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  return { upcoming, previous };
}

export function seedSampleBookings(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(STORAGE_KEY)) return;
  const today = new Date();
  const seedTimes = ["18:30", "20:00", "21:30"];
  const seedNames = ["Karim", "Sara & Friends", "Maya", "Rami"];
  const sampleBookings: Booking[] = [];
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayOffset);
    const key = formatDateKey(d);
    const count = dayOffset === 0 ? 1 : dayOffset === 1 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const time = seedTimes[(dayOffset + i) % seedTimes.length] ?? "20:00";
      if (isSlotPast(key, time)) continue;
      const slot = ALL_SLOTS.find((s) => s.time === time);
      if (!slot) continue;
      sampleBookings.push({
        id: crypto.randomUUID(),
        reference: generateReference(),
        date: key,
        time,
        duration: SLOT_DURATION,
        name: seedNames[(dayOffset + i) % seedNames.length] ?? "Guest",
        phone: "+961 71 123 456",
        players: 4,
        price: slot.price,
        paymentMethod: "court",
        createdAt: new Date().toISOString(),
        courtName: COURT_NAME,
        status: "upcoming",
      });
    }
  }
  saveBookings(sampleBookings);
}
