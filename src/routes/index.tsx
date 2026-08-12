import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_SLOTS,
  COURT_NAME,
  SLOT_DURATION,
  addBooking,
  formatDisplayDate,
  formatTime12h,
  generateDayOptions,
  getBookingsByStatus,
  getSlotEndTime,
  getSlotPrice,
  getSlotStatus,
  type TimeSlot,
} from "@/lib/bookings";
import hero1 from "@/assets/hero-1.jpg.asset.json";
import hero2 from "@/assets/hero-2.jpg.asset.json";
import hero3 from "@/assets/hero-3.jpg.asset.json";
import hero4 from "@/assets/hero-4.jpg.asset.json";
import hero5 from "@/assets/hero-5.jpg.asset.json";

const HERO_IMAGES = [
  { url: hero1.url, alt: "Outdoor padel court at golden hour in the Lebanese mountains" },
  { url: hero2.url, alt: "Padel court lit for an evening game" },
  { url: hero3.url, alt: "Close-up of the padel court net and green surface" },
  { url: hero4.url, alt: "Friends enjoying a padel game at Assia" },
  { url: hero5.url, alt: "Wide view of the court surrounded by mountains" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assia Padel Court | Book Your Court" },
      { name: "description", content: "Book a single outdoor padel court in Assia, Lebanon. Check availability, choose your time, and confirm in seconds." },
      { property: "og:title", content: "Assia Padel Court | Book Your Court" },
      { property: "og:description", content: "Book a single outdoor padel court in Assia, Lebanon. Check availability, choose your time, and confirm in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="bg-background">
      <HeroGallery />
      <div className="mx-auto max-w-2xl px-4">
        <BookingSection />
        <PhotoGallery />
        <AboutSection />
        <FacilitiesSection />
        <LocationSection />
        <ContactFooter />
      </div>
    </div>
  );
}

function HeroGallery() {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleDot = (i: number) => setIndex(i);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) setIndex((i) => (i + 1) % HERO_IMAGES.length);
      else setIndex((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
    }
    touchStart.current = null;
  };

  return (
    <section className="relative w-full overflow-hidden bg-secondary" ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
        {HERO_IMAGES.map((img, i) => (
          <div
            key={img.url}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="h-full w-full object-cover"
              width={1200}
              height={800}
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6">
          <div className="mx-auto w-full max-w-2xl">
            <p className="font-display text-2xl font-bold text-white sm:text-3xl">Your Court. Your Game.</p>
            <p className="mt-1 max-w-sm text-sm font-medium text-white/90">Book your next padel session in seconds.</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => handleDot(i)}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}

function BookingSection() {
  const days = useMemo(() => generateDayOptions(14), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(days[0]?.key ?? "");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<"summary" | "details" | "success">("summary");
  const [confirmedBooking, setConfirmedBooking] = useState<{ reference: string; date: string; time: string; price: number; players: number } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", players: 4, notes: "" });
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    setUpcomingCount(getBookingsByStatus().upcoming.length);
  }, [selectedDateKey, selectedTime, sheetOpen]);

  const handleSlotSelect = (time: string) => {
    setSelectedTime(time);
    setSheetState("summary");
    setSheetOpen(true);
  };

  const handleContinue = () => {
    setSheetState("details");
  };

  const handleConfirm = () => {
    if (!selectedTime || !selectedDateKey) return;
    const slot = ALL_SLOTS.find((s) => s.time === selectedTime);
    if (!slot) return;
    const booking = addBooking({
      date: selectedDateKey,
      time: selectedTime,
      duration: SLOT_DURATION,
      name: form.name || "Guest",
      phone: form.phone,
      players: form.players,
      price: getSlotPrice(slot),
      courtName: COURT_NAME,
      ...(form.email && { email: form.email }),
      ...(form.notes && { notes: form.notes }),
    });
    setConfirmedBooking({ reference: booking.reference, date: selectedDateKey, time: selectedTime, price: booking.price, players: form.players });
    setSheetState("success");
    setUpcomingCount(getBookingsByStatus().upcoming.length);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setSelectedTime(null);
    setForm({ name: "", phone: "", email: "", players: 4, notes: "" });
  };

  const selectedSlot = ALL_SLOTS.find((s) => s.time === selectedTime) || null;
  const selectedDayLabel = days.find((d) => d.key === selectedDateKey)?.label ?? "Today";

  return (
    <section className="py-6" id="booking">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Book Your Court</h1>
        <p className="mt-1 text-sm text-muted-foreground">One court. Simple availability. Under 30 seconds.</p>
        {upcomingCount > 0 && (
          <Link to="/bookings" className="mt-2 inline-flex items-center text-sm font-medium text-primary">
            You have {upcomingCount} upcoming booking{upcomingCount === 1 ? "" : "s"}
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Select a date</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                setSelectedDateKey(d.key);
                setSelectedTime(null);
              }}
              className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2.5 transition-all ${
                selectedDateKey === d.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-xs font-semibold uppercase">{d.label}</span>
              <span className="text-sm font-bold">{d.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          Available slots for {selectedDayLabel === "Today" ? "today" : selectedDayLabel.toLowerCase()}
        </p>
        <SlotList dateKey={selectedDateKey} selectedTime={selectedTime} onSelect={handleSlotSelect} />
      </div>

      {sheetOpen && selectedSlot && (
        <Sheet onClose={handleClose}>
          {sheetState === "summary" && (
            <SummarySheet
              dateKey={selectedDateKey}
              slot={selectedSlot}
              onContinue={handleContinue}
              onClose={handleClose}
            />
          )}
          {sheetState === "details" && (
            <DetailsSheet
              dateKey={selectedDateKey}
              slot={selectedSlot}
              form={form}
              setForm={setForm}
              onConfirm={handleConfirm}
              onBack={() => setSheetState("summary")}
            />
          )}
          {sheetState === "success" && confirmedBooking && (
            <SuccessSheet booking={confirmedBooking} onClose={handleClose} />
          )}
        </Sheet>
      )}
    </section>
  );
}

function SlotList({ dateKey, selectedTime, onSelect }: { dateKey: string; selectedTime: string | null; onSelect: (time: string) => void }) {
  const groups = useMemo(() => {
    const byPeriod: Record<"morning" | "afternoon" | "evening", TimeSlot[]> = { morning: [], afternoon: [], evening: [] };
    for (const slot of ALL_SLOTS) {
      byPeriod[slot.period].push(slot);
    }
    return byPeriod;
  }, []);

  const periodLabel = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

  const allUnavailable = ALL_SLOTS.every((s) => {
    const status = getSlotStatus(dateKey, s.time, selectedTime ?? undefined);
    return status === "booked" || status === "past";
  });

  if (allUnavailable) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-display text-lg font-semibold text-foreground">No slots left today.</p>
        <p className="mt-1 text-sm text-muted-foreground">Looks like the court is fully booked.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(["morning", "afternoon", "evening"] as const).map((period) => {
        const slots = groups[period];
        if (slots.length === 0) return null;
        const visibleSlots = slots.filter((s) => getSlotStatus(dateKey, s.time, selectedTime ?? undefined) !== "past");
        if (visibleSlots.length === 0) return null;
        return (
          <div key={period}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{periodLabel[period]}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const status = getSlotStatus(dateKey, slot.time, selectedTime ?? undefined);
                return (
                  <TimeSlotButton
                    key={slot.time}
                    slot={slot}
                    status={status}
                    onClick={() => {
                      if (status === "available" || status === "selected") onSelect(slot.time);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeSlotButton({ slot, status, onClick }: { slot: TimeSlot; status: ReturnType<typeof getSlotStatus>; onClick: () => void }) {
  const base = "relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-sm font-medium transition-all";
  const styles = {
    available: "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5 active:scale-95",
    selected: "border-primary bg-primary text-primary-foreground shadow-sm",
    booked: "border-transparent bg-muted text-muted-foreground cursor-not-allowed opacity-70",
    past: "border-transparent bg-muted text-muted-foreground cursor-not-allowed opacity-50",
  };

  return (
    <button
      type="button"
      disabled={status === "booked" || status === "past"}
      onClick={onClick}
      className={`${base} ${styles[status]}`}
      aria-label={status === "booked" ? `${slot.label} booked` : status === "past" ? `${slot.label} past` : slot.label}
    >
      <span>{slot.label}</span>
      {status === "booked" && <span className="mt-0.5 text-[10px] font-normal">Booked</span>}
      {status === "past" && <span className="mt-0.5 text-[10px] font-normal">Past</span>}
      {status === "available" && <span className="mt-0.5 text-[10px] font-normal text-primary">${slot.price}</span>}
    </button>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-backdrop-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-sheet-in rounded-t-2xl bg-card p-5 pb-8 shadow-xl sm:rounded-2xl sm:p-6 sm:pb-6 safe-area-inset-bottom">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted sm:hidden" />
        {children}
      </div>
    </div>
  );
}

function SummarySheet({
  dateKey,
  slot,
  onContinue,
  onClose,
}: {
  dateKey: string;
  slot: TimeSlot;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <p className="font-display text-xl font-bold text-foreground">{formatDisplayDate(dateKey)}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatTime12h(slot.time)} — {getSlotEndTime(slot.time, slot.duration)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {COURT_NAME} · {slot.duration} min · ${slot.price}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Change Time
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue Booking
        </button>
      </div>
    </div>
  );
}

function DetailsSheet({
  dateKey,
  slot,
  form,
  setForm,
  onConfirm,
  onBack,
}: {
  dateKey: string;
  slot: TimeSlot;
  form: { name: string; phone: string; email: string; players: number; notes: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const canSubmit = form.name.trim().length >= 2 && form.phone.trim().length >= 8;

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to summary
      </button>
      <p className="font-display text-xl font-bold text-foreground">Your details</p>
      <p className="text-sm text-muted-foreground">
        {formatDisplayDate(dateKey)} · {formatTime12h(slot.time)} — {getSlotEndTime(slot.time, slot.duration)}
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
            Full Name <span className="text-primary">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Karim Haddad"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
            Mobile Number <span className="text-primary">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+961 71 234 567"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">We may contact you about your booking.</p>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
            Email <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Number of players</p>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((f) => ({ ...f, players: n }))}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                  form.players === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-foreground">
            Notes <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Anything we should know?"
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onConfirm}
          className={`w-full rounded-xl py-3.5 text-base font-semibold transition-colors ${
            canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          Confirm Booking · ${slot.price}
        </button>
      </div>
    </div>
  );
}

function SuccessSheet({
  booking,
  onClose,
}: {
  booking: { reference: string; date: string; time: string; price: number; players: number };
  onClose: () => void;
}) {
  const shareData = {
    title: "Assia Padel Court Booking",
    text: `I booked Court 1 at Assia Padel Court on ${formatDisplayDate(booking.date)} at ${formatTime12h(booking.time)}. Reference: ${booking.reference}`,
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      }
    } catch {
      // ignore
    }
  };

  const calendarUrl = useMemo(() => {
    const start = new Date(`${booking.date}T${booking.time}:00`);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0];
    const title = encodeURIComponent("Padel at Assia Padel Court");
    const details = encodeURIComponent(`Court booking. Reference: ${booking.reference}`);
    const location = encodeURIComponent("Assia, Lebanon");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${fmt(start)}/${fmt(end)}&text=${title}&details=${details}&location=${location}`;
  }, [booking]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckIcon className="h-7 w-7" />
      </div>
      <p className="font-display text-2xl font-bold text-foreground">Court Booked</p>
      <p className="mt-1 text-sm text-muted-foreground">{formatDisplayDate(booking.date)}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {formatTime12h(booking.time)} — {getSlotEndTime(booking.time, 90)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {COURT_NAME} · {booking.players} players · ${booking.price} — Pay at Court
      </p>
      <p className="mt-4 text-sm font-medium text-foreground">
        Booking reference: <span className="font-display text-base font-bold">{booking.reference}</span>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Add to Calendar
        </a>
        <a
          href="https://maps.google.com/?q=Assia+Lebanon"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Get Directions
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Share Booking
        </button>
        <a
          href="https://wa.me/96171234567?text=Hello, I have a booking at Assia Padel Court"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          WhatsApp
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          to="/bookings"
          onClick={onClose}
          className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View My Bookings
        </Link>
        <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Book another slot
        </button>
      </div>
    </div>
  );
}

function PhotoGallery() {
  return (
    <section className="py-8" id="photos">
      <h2 className="font-display text-lg font-semibold text-foreground">Court Photos</h2>
      <p className="text-sm text-muted-foreground">A glimpse of the court before your visit.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {HERO_IMAGES.map((img, i) => (
          <div key={img.url} className={`overflow-hidden rounded-xl ${i === 0 ? "col-span-2" : ""}`}>
            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" width={600} height={400} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="py-8" id="about">
      <h2 className="font-display text-lg font-semibold text-foreground">A court for the village</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Assia Padel Court is a single outdoor court built for casual games, friendly competition, and easy evenings in the Lebanese mountains. No memberships, no app stores — just book and play.
      </p>
      <Link to="/about" className="mt-3 inline-flex items-center text-sm font-semibold text-primary">
        More about the court
        <ArrowRightIcon className="ml-1 h-4 w-4" />
      </Link>
    </section>
  );
}

function FacilitiesSection() {
  const facilities = [
    "Outdoor court with floodlights",
    "Parking on-site",
    "Changing area & showers",
    "Racket & ball rental",
    "Drinks available",
    "Seating area",
  ];

  return (
    <section className="py-8" id="facilities">
      <h2 className="font-display text-lg font-semibold text-foreground">Facilities</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {facilities.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LocationSection() {
  return (
    <section className="py-8" id="location">
      <h2 className="font-display text-lg font-semibold text-foreground">Find us</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Assia, Batroun District, Lebanon
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-secondary">
        <div className="flex aspect-video items-center justify-center">
          <div className="text-center">
            <LocationIcon className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">Map loading</p>
            <p className="text-xs text-muted-foreground">Directions available on request</p>
          </div>
        </div>
      </div>
      <a
        href="https://maps.google.com/?q=Assia+Lebanon"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Get Directions
      </a>
    </section>
  );
}

function ContactFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Questions?</p>
          <p className="text-sm text-muted-foreground">Reach us directly on WhatsApp or by phone.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/96171234567"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Contact on WhatsApp
          </a>
          <a
            href="tel:+96171234567"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Call +961 71 234 567
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Assia Padel Court. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
