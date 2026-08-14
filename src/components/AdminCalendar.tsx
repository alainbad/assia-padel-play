import { useMemo, useState } from "react";

import { ALL_SLOTS, formatDateKey, formatDisplayDate, formatTime12h } from "@/lib/bookings";

type CalendarBooking = {
  id: string;
  date: string;
  time: string;
  name: string;
  status: string;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function AdminCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const bookedMap = useMemo(() => {
    const map = new Map<string, Map<string, CalendarBooking>>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      if (!map.has(b.date)) map.set(b.date, new Map());
      map.get(b.date)!.set(b.time, b);
    }
    return map;
  }, [bookings]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const monthGrid = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);

  function shift(dir: number) {
    setAnchor((prev) => {
      const d = new Date(prev);
      if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  const total = ALL_SLOTS.length;
  const todayKey = formatDateKey(new Date());

  const rangeLabel =
    view === "week"
      ? `${weekDays[0]!.getDate()} ${MONTH_NAMES[weekDays[0]!.getMonth()]!.slice(0, 3)} – ${weekDays[6]!.getDate()} ${MONTH_NAMES[weekDays[6]!.getMonth()]!.slice(0, 3)}`
      : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous"
            className="rounded-lg border border-input px-2.5 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            ‹
          </button>
          <p className="min-w-[10rem] text-center font-display text-base font-bold text-foreground">{rangeLabel}</p>
          <button
            onClick={() => shift(1)}
            aria-label="Next"
            className="rounded-lg border border-input px-2.5 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            ›
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="ml-1 rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            Today
          </button>
        </div>
        <div className="flex rounded-lg border border-input p-0.5">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border bg-background" /> Free
        </span>
      </div>

      {view === "week" ? (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-1">
              <div />
              {weekDays.map((d) => {
                const key = formatDateKey(d);
                const bookedCount = bookedMap.get(key)?.size ?? 0;
                return (
                  <div
                    key={key}
                    className={`rounded-md px-1 py-1.5 text-center ${key === todayKey ? "bg-secondary" : ""}`}
                  >
                    <p className="text-xs font-semibold text-foreground">{DAY_NAMES[(d.getDay() + 6) % 7]}</p>
                    <p className="text-xs text-muted-foreground">{d.getDate()}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {bookedCount}/{total}
                    </p>
                  </div>
                );
              })}
              {ALL_SLOTS.map((slot) => (
                <div key={slot.time} className="contents">
                  <div className="py-1 pr-1 text-right text-[11px] text-muted-foreground">{slot.label}</div>
                  {weekDays.map((d) => {
                    const key = formatDateKey(d);
                    const booking = bookedMap.get(key)?.get(slot.time);
                    return (
                      <div
                        key={`${key}-${slot.time}`}
                        title={booking ? `${booking.name} · ${formatTime12h(slot.time)}` : "Free"}
                        className={`min-h-8 truncate rounded-md border px-1.5 py-1 text-[10px] ${
                          booking
                            ? "border-primary/30 bg-primary/15 font-semibold text-primary"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {booking ? booking.name : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthGrid.map((d) => {
              const key = formatDateKey(d);
              const bookedCount = bookedMap.get(key)?.size ?? 0;
              const inMonth = d.getMonth() === anchor.getMonth();
              return (
                <div
                  key={key}
                  title={`${formatDisplayDate(key)} — ${bookedCount} booked, ${total - bookedCount} free`}
                  className={`min-h-[4.5rem] rounded-md border p-1.5 ${
                    inMonth ? "border-border bg-background" : "border-transparent bg-secondary/40 opacity-60"
                  } ${key === todayKey ? "ring-1 ring-primary" : ""}`}
                >
                  <p className="text-xs font-semibold text-foreground">{d.getDate()}</p>
                  {bookedCount > 0 ? (
                    <>
                      <p className="mt-0.5 text-[10px] font-semibold text-primary">{bookedCount} booked</p>
                      <p className="text-[10px] text-muted-foreground">{total - bookedCount} free</p>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {ALL_SLOTS.map((s) => (
                          <span
                            key={s.time}
                            className={`h-1.5 w-1.5 rounded-full ${
                              bookedMap.get(key)?.has(s.time) ? "bg-primary" : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">All free</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}