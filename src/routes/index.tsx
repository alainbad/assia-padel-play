import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettings, getAvailability } from "@/lib/management.functions";
import { defaultContent, defaultSchedule } from "@/lib/site-content";
const ContentContext = createContext(defaultContent);
const ScheduleContext = createContext(defaultSchedule);
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  COURT_NAME,
  DEPOSIT_AMOUNT,
  addBooking,
  formatDisplayDate,
  formatTime12h,
  generateDayOptions,
  getBookingsByStatus,
  getSlotEndTime,
  getSlotPrice,
  getSlotStatus,
  PAYMENT_METHODS,
  WHISH_NUMBER,
  paymentLabel,
  type PaymentMethod,
  type TimeSlot,
} from "@/lib/bookings";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assia Padel Court | Book Your Court" },
      {
        name: "description",
        content:
          "Book a single outdoor padel court in Assia, Lebanon. Check availability, choose your time, and confirm in seconds.",
      },
      { property: "og:title", content: "Assia Padel Court | Book Your Court" },
      {
        property: "og:description",
        content:
          "Book a single outdoor padel court in Assia, Lebanon. Check availability, choose your time, and confirm in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const fetch = useServerFn(getSiteSettings);
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => fetch() });
  return (
    <ContentContext.Provider value={settings.data?.content ?? defaultContent}>
      <ScheduleContext.Provider value={settings.data?.schedule ?? defaultSchedule}>
        <div className="bg-background" id="home">
          <HeroGallery />
          {settings.isError && (
            <p role="alert" className="p-4 text-center text-destructive">
              Court settings are unavailable. Please refresh before booking.
            </p>
          )}
          <div className="mx-auto max-w-2xl px-4">
            {settings.data && <BookingSection />}
            <PhotoGallery />
            <AboutSection />
            <FacilitiesSection />
            <LocationSection />
            <ContactFooter />
          </div>
        </div>
      </ScheduleContext.Provider>
    </ContentContext.Provider>
  );
}

function HeroGallery() {
  const content = useContext(ContentContext);
  const HERO_IMAGES = content.heroImages;
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [HERO_IMAGES.length]);

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
    <section
      className="relative w-full overflow-hidden bg-secondary"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
        {HERO_IMAGES.map((img, i) => (
          <div
            key={img.url}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="h-full w-full object-contain bg-[#24282b]"
              width={2048}
              height={2048}
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>
      <div className="relative bg-[#24282b]">
        <div className="flex flex-col justify-end p-4 pb-8">
          <div className="mx-auto w-full max-w-2xl">
            <p className="font-display text-2xl font-bold text-white sm:text-3xl">
              {content.heroTitle}
            </p>
            <p className="mt-1 max-w-sm text-sm font-medium text-white/90">
              {content.heroSubtitle}
            </p>
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
  const content = useContext(ContentContext);
  const schedule = useContext(ScheduleContext);
  const ALL_SLOTS = useMemo(() => makeSlots(schedule), [schedule]);
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const days = useMemo(() => generateDayOptions(14), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(days[0]?.key ?? "");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<"summary" | "details" | "success">("summary");
  const [confirmedBooking, setConfirmedBooking] = useState<{
    reference: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    players: number;
    paymentMethod: PaymentMethod;
    whishAmount: number;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    players: 4,
    notes: "",
    paymentMethod: "court" as PaymentMethod,
    whishAmountOption: "full" as "deposit" | "full",
  });
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setBookingError("");
    try {
      if (!selectedTime || !selectedDateKey) return;
      const slot = ALL_SLOTS.find((s) => s.time === selectedTime);
      if (!slot) return;
      const booking = await addBooking({
        date: selectedDateKey,
        time: selectedTime,
        duration: slot.duration,
        name: form.name || "Guest",
        phone: form.phone,
        players: form.players,
        price: getSlotPrice(slot),
        paymentMethod: form.paymentMethod,
        courtName: COURT_NAME,
        ...(form.email && { email: form.email }),
        ...(form.notes && { notes: form.notes }),
      });

      const whishAmount = form.whishAmountOption === "deposit" ? DEPOSIT_AMOUNT : booking.price;
      setConfirmedBooking({
        reference: booking.reference,
        date: selectedDateKey,
        time: selectedTime,
        duration: booking.duration,
        price: booking.price,
        players: form.players,
        paymentMethod: form.paymentMethod,
        whishAmount,
      });
      setSheetState("success");
      setUpcomingCount(getBookingsByStatus().upcoming.length);
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : "Booking failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSheetOpen(false);
    setSelectedTime(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      players: 4,
      notes: "",
      paymentMethod: "court",
      whishAmountOption: "full",
    });
  };

  const selectedSlot = ALL_SLOTS.find((s) => s.time === selectedTime) || null;
  const selectedDayLabel = days.find((d) => d.key === selectedDateKey)?.label ?? "Today";

  return (
    <section className="py-6" id="booking">
      <a
        href="#home"
        className="mb-4 inline-flex rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-secondary"
      >
        ← Home
      </a>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {content.bookingTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{content.bookingSubtitle}</p>
        {upcomingCount > 0 && (
          <Link
            to="/bookings"
            className="mt-2 inline-flex items-center text-sm font-medium text-primary"
          >
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
          Available slots for{" "}
          {selectedDayLabel === "Today" ? "today" : selectedDayLabel.toLowerCase()}
        </p>
        {hydrated ? (
          <SlotList
            dateKey={selectedDateKey}
            selectedTime={selectedTime}
            onSelect={handleSlotSelect}
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {ALL_SLOTS.map((s) => (
              <div key={s.time} className="h-[62px] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
      </div>

      {sheetOpen && selectedSlot && (
        <Sheet onClose={handleClose}>
          {bookingError && (
            <p role="alert" className="mb-4 text-destructive">
              {bookingError}
            </p>
          )}
          {saving && <p role="status">Confirming reservation…</p>}
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
              onConfirm={() => {
                void handleConfirm();
              }}
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

function SlotList({
  dateKey,
  selectedTime,
  onSelect,
}: {
  dateKey: string;
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  const schedule = useContext(ScheduleContext);
  const ALL_SLOTS = useMemo(() => makeSlots(schedule), [schedule]);
  const fetch = useServerFn(getAvailability);
  const availability = useQuery({
    queryKey: ["availability", dateKey],
    queryFn: () => fetch({ data: { date: dateKey } }),
    refetchInterval: 15000,
  });
  const getSlotStatus = (
    _date: string,
    time: string,
    selected?: string,
  ): "past" | "booked" | "selected" | "available" => {
    const start = Date.parse(`${dateKey}T${time}:00Z`);
    const lebanonNow =
      new Date().toLocaleString("sv-SE", { timeZone: "Asia/Beirut" }).replace(" ", "T") + "Z";
    if (start < Date.parse(lebanonNow)) return "past";
    if (
      availability.data?.blocked.includes(time) ||
      availability.data?.bookings.some((b) => {
        const bs = Date.parse(`${b.date}T${b.time}:00Z`);
        return bs < start + schedule.duration * 60000 && bs + b.duration * 60000 > start;
      })
    )
      return "booked";
    return selected === time ? "selected" : "available";
  };
  const groups = useMemo(() => {
    const byPeriod: Record<"morning" | "afternoon" | "evening", TimeSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const slot of ALL_SLOTS) {
      byPeriod[slot.period].push(slot);
    }
    return byPeriod;
  }, [ALL_SLOTS]);

  const periodLabel = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

  const allUnavailable = ALL_SLOTS.every((s) => {
    const status = getSlotStatus(dateKey, s.time, selectedTime ?? undefined);
    return status === "booked" || status === "past";
  });

  if (availability.isPending) return <p>Loading available slots…</p>;
  if (availability.isError)
    return (
      <p role="alert">
        Cannot load availability.{" "}
        <button className="underline" onClick={() => void availability.refetch()}>
          Retry
        </button>
      </p>
    );
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
        const visibleSlots = slots.filter(
          (s) => getSlotStatus(dateKey, s.time, selectedTime ?? undefined) !== "past",
        );
        if (visibleSlots.length === 0) return null;
        return (
          <div key={period}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {periodLabel[period]}
            </p>
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

function TimeSlotButton({
  slot,
  status,
  onClick,
}: {
  slot: TimeSlot;
  status: ReturnType<typeof getSlotStatus>;
  onClick: () => void;
}) {
  const base =
    "relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-sm font-medium transition-all";
  const styles = {
    available:
      "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5 active:scale-95",
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
      aria-label={
        status === "booked"
          ? `${slot.label} booked`
          : status === "past"
            ? `${slot.label} past`
            : slot.label
      }
    >
      <span>{slot.label}</span>
      {status === "booked" && <span className="mt-0.5 text-[10px] font-normal">Booked</span>}
      {status === "past" && <span className="mt-0.5 text-[10px] font-normal">Past</span>}
      {status === "available" && (
        <span className="mt-0.5 text-[10px] font-normal text-primary">${slot.price}</span>
      )}
    </button>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
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
        <p className="font-display text-xl font-bold text-foreground">
          {formatDisplayDate(dateKey)}
        </p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatTime12h(slot.time)} — {getSlotEndTime(slot.time, slot.duration)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {COURT_NAME} · {slot.duration} min · ${slot.price}
        </p>
      </div>

      <div className="flex gap-3 px-1">
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
  form: {
    name: string;
    phone: string;
    email: string;
    players: number;
    notes: string;
    paymentMethod: PaymentMethod;
    whishAmountOption: "deposit" | "full";
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const canSubmit = form.name.trim().length >= 2 && form.phone.trim().length >= 8;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to summary
      </button>
      <p className="font-display text-xl font-bold text-foreground">Your details</p>
      <p className="text-sm text-muted-foreground">
        {formatDisplayDate(dateKey)} · {formatTime12h(slot.time)} —{" "}
        {getSlotEndTime(slot.time, slot.duration)}
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
          <p className="mb-2 text-sm font-medium text-foreground">Payment method</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => {
              const active = form.paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, paymentMethod: m.id }))}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-primary" : "border-input"
                    }`}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {form.paymentMethod === "whish" && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "deposit" as const, label: "Pay deposit", amount: DEPOSIT_AMOUNT },
                  { id: "full" as const, label: "Pay full amount", amount: slot.price },
                ].map((opt) => {
                  const active = form.whishAmountOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, whishAmountOption: opt.id }))}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      <span className="block text-xs font-semibold text-foreground">
                        {opt.label}
                      </span>
                      <span className="block text-sm font-bold text-foreground">${opt.amount}</span>
                    </button>
                  );
                })}
              </div>
              <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-secondary-foreground">
                Send ${form.whishAmountOption === "deposit" ? DEPOSIT_AMOUNT : slot.price} by Whish
                to <span className="font-semibold">{WHISH_NUMBER}</span> and keep the confirmation.
                Your slot is held until then.
                {form.whishAmountOption === "deposit" && (
                  <> The remaining ${slot.price - DEPOSIT_AMOUNT} is due at the court.</>
                )}
              </p>
            </div>
          )}
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
            placeholder="+961 3 414 477"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We may contact you about your booking.
          </p>
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
            canSubmit
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
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
  booking: {
    reference: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    players: number;
    paymentMethod: PaymentMethod;
    whishAmount: number;
  };
  onClose: () => void;
}) {
  const content = useContext(ContentContext);
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
    const end = new Date(start.getTime() + booking.duration * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0];
    const title = encodeURIComponent("Padel at Assia Padel Court");
    const details = encodeURIComponent(`Court booking. Reference: ${booking.reference}`);
    const location = encodeURIComponent("34.225754,35.779507");
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
        {formatTime12h(booking.time)} — {getSlotEndTime(booking.time, booking.duration)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {COURT_NAME} · {booking.players} players · ${booking.price} —{" "}
        {paymentLabel(booking.paymentMethod)}
      </p>
      {booking.paymentMethod === "whish" && (
        <p className="mt-2 rounded-xl bg-secondary px-4 py-3 text-xs text-secondary-foreground">
          Send ${booking.whishAmount} by Whish to{" "}
          <span className="font-semibold">{WHISH_NUMBER}</span> to complete your payment.
          {booking.whishAmount < booking.price && (
            <> The remaining ${booking.price - booking.whishAmount} is due at the court.</>
          )}
        </p>
      )}
      <p className="mt-4 text-sm font-medium text-foreground">
        Booking reference:{" "}
        <span className="font-display text-base font-bold">{booking.reference}</span>
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
          href={content.directionsUrl}
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
          href={`https://wa.me/${content.whatsapp}?text=Hello, I have a booking at Assia Padel Court`}
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
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Book another slot
        </button>
      </div>
    </div>
  );
}

function PhotoGallery() {
  const content = useContext(ContentContext);
  return (
    <section className="py-8" id="photos">
      <h2 className="font-display text-lg font-semibold text-foreground">{content.photosTitle}</h2>
      <p className="text-sm text-muted-foreground">{content.photosSubtitle}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {content.courtImages.map((img, i) => (
          <div
            key={img.url}
            className={`overflow-hidden rounded-xl ${i === 0 ? "col-span-2" : ""}`}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="h-full w-full object-cover"
              width={600}
              height={400}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  const content = useContext(ContentContext);
  return (
    <section className="py-8" id="about">
      <h2 className="font-display text-lg font-semibold text-foreground">{content.aboutTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content.aboutBody}</p>
      <Link
        to="/about"
        className="mt-3 inline-flex items-center text-sm font-semibold text-primary"
      >
        {content.aboutLink}
        <ArrowRightIcon className="ml-1 h-4 w-4" />
      </Link>
    </section>
  );
}

function FacilitiesSection() {
  const content = useContext(ContentContext);
  const facilities = content.facilities;

  return (
    <section className="py-8" id="facilities">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {content.facilitiesTitle}
      </h2>
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
  const content = useContext(ContentContext);
  return (
    <section className="py-8" id="location">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {content.locationTitle}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{content.locationAddress}</p>
      <a
        href={content.directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block overflow-hidden rounded-xl border border-border"
      >
        <img
          src={content.locationImage}
          alt={content.locationAlt}
          width={815}
          height={1086}
          loading="lazy"
          className="block h-auto w-full"
        />
      </a>
      <a
        href={content.directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {content.directionsLabel}
      </a>
    </section>
  );
}

function ContactFooter() {
  const content = useContext(ContentContext);
  const schedule = useContext(ScheduleContext);
  return (
    <footer className="border-t border-border py-8">
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold">{content.openingHoursTitle}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {content.openingHoursText ||
            `Daily: ${formatTime12h(schedule.times[0]!)} – ${getSlotEndTime(schedule.times.at(-1)!, schedule.duration)}. Last booking starts at ${formatTime12h(schedule.times.at(-1)!)}.`}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {content.contactTitle}
          </p>
          <p className="text-sm text-muted-foreground">{content.contactBody}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {content.contactEmail && (
            <a
              href={`mailto:${content.contactEmail}`}
              className="inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
            >
              {content.contactEmail}
            </a>
          )}
          <a
            href={`https://wa.me/${content.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {content.whatsappLabel}
          </a>
          <a
            href={`tel:${content.phone.replace(/[^+0-9]/g, "")}`}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Call {content.phone}
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {content.copyright}
        </p>
      </div>
    </footer>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function makeSlots(schedule: typeof defaultSchedule): TimeSlot[] {
  return schedule.times.map((time) => ({
    time,
    label: formatTime12h(time),
    duration: schedule.duration,
    price: schedule.price,
    period:
      Number(time.slice(0, 2)) < 12
        ? "morning"
        : Number(time.slice(0, 2)) < 18
          ? "afternoon"
          : "evening",
  }));
}
