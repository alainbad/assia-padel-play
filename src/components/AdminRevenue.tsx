import { useMemo, useState } from "react";
import {
  amountCollected,
  amountPending,
  formatDateKey,
  formatTime12h,
  paymentLabel,
  paymentStatusLabel,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/bookings";

type RevenueBooking = {
  date: string;
  time: string;
  name: string;
  phone: string;
  price: number;
  payment_method: string;
  payment_status: PaymentStatus;
  status: string;
  reference: string;
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function shortDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -day);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function AdminRevenue({ bookings }: { bookings: RevenueBooking[] }) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function applyPreset(preset: "all" | "week" | "month") {
    if (preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    const now = new Date();
    if (preset === "week") {
      const start = startOfWeek(now);
      setFromDate(formatDateKey(start));
      setToDate(formatDateKey(addDays(start, 6)));
    } else {
      setFromDate(formatDateKey(startOfMonth(now)));
      setToDate(formatDateKey(endOfMonth(now)));
    }
  }

  const inRange = useMemo(() => {
    return (dateKey: string) => {
      if (fromDate && dateKey < fromDate) return false;
      if (toDate && dateKey > toDate) return false;
      return true;
    };
  }, [fromDate, toDate]);

  const rangeLabel =
    !fromDate && !toDate
      ? "All time"
      : `${fromDate ? shortDate(fromDate) : "…"} – ${toDate ? shortDate(toDate) : "…"}`;

  const filtered = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && inRange(b.date)),
    [bookings, inRange],
  );

  const stats = useMemo(() => {
    let collected = 0;
    let pending = 0;
    let collectedCourt = 0;
    let collectedWhish = 0;
    let pendingCourt = 0;
    let pendingWhish = 0;
    for (const b of filtered) {
      const isWhish = b.payment_method === "whish";
      const gotten = amountCollected(b.price, b.payment_status);
      const owed = amountPending(b.price, b.payment_status);
      collected += gotten;
      pending += owed;
      if (isWhish) {
        collectedWhish += gotten;
        pendingWhish += owed;
      } else {
        collectedCourt += gotten;
        pendingCourt += owed;
      }
    }
    return {
      collected,
      pending,
      total: collected + pending,
      collectedCourt,
      collectedWhish,
      pendingCourt,
      pendingWhish,
    };
  }, [filtered]);

  function downloadReport() {
    const sorted = [...filtered].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );

    const lines: string[] = [
      "Assia Padel Court — Money Report",
      `Generated,${new Date().toLocaleString()}`,
      `Range,${rangeLabel}`,
      "",
      "Summary",
      `Total Collected,${stats.collected}`,
      `Total Pending,${stats.pending}`,
      `Grand Total,${stats.total}`,
      `Collected - Pay at court,${stats.collectedCourt}`,
      `Collected - Whish,${stats.collectedWhish}`,
      `Pending - Pay at court,${stats.pendingCourt}`,
      `Pending - Whish,${stats.pendingWhish}`,
      "",
      "Date,Time,Customer,Phone,Payment Method,Price,Payment Status,Amount Collected,Amount Pending,Reference",
      ...sorted.map((b) =>
        [
          b.date,
          formatTime12h(b.time),
          csvEscape(b.name),
          b.phone,
          paymentLabel(b.payment_method as PaymentMethod),
          b.price,
          paymentStatusLabel(b.payment_status),
          amountCollected(b.price, b.payment_status),
          amountPending(b.price, b.payment_status),
          b.reference,
        ].join(","),
      ),
      "",
      `Totals for ${rangeLabel}`,
      `Total Cash on Hand,${stats.collected}`,
      `Total Pending Cash,${stats.pending}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix =
      fromDate || toDate
        ? `${fromDate || "start"}_to_${toDate || "now"}`
        : formatDateKey(new Date());
    a.href = url;
    a.download = `assia-padel-money-report-${suffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Money</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Based on payment status marked per booking below — not automatic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setRangeOpen((v) => !v)}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              {rangeLabel} ▾
            </button>
            {rangeOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "week", "month"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className="rounded-lg border border-input px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary"
                    >
                      {p === "all" ? "All time" : p === "week" ? "This week" : "This month"}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-medium text-muted-foreground">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-muted-foreground">To</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
                <button
                  onClick={() => setRangeOpen(false)}
                  className="mt-3 w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            )}
          </div>
          <button
            onClick={downloadReport}
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Download report (CSV)
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Collected
          </p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">${stats.collected}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ${stats.collectedCourt} at court · ${stats.collectedWhish} via Whish
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending
          </p>
          <p className="mt-1 font-display text-xl font-bold text-primary">${stats.pending}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ${stats.pendingCourt} at court · ${stats.pendingWhish} via Whish
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">${stats.total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Collected + pending, excludes cancelled
          </p>
        </div>
      </div>
    </section>
  );
}
