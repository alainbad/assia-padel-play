import { useMemo } from "react";
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

export function AdminRevenue({ bookings }: { bookings: RevenueBooking[] }) {
  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    let collected = 0;
    let pending = 0;
    let collectedCourt = 0;
    let collectedWhish = 0;
    let pendingCourt = 0;
    let pendingWhish = 0;
    for (const b of active) {
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
  }, [bookings]);

  function downloadReport() {
    const active = [...bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    const lines: string[] = [
      "Assia Padel Court — Money Report",
      `Generated,${new Date().toLocaleString()}`,
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
      ...active.map((b) =>
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
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assia-padel-money-report-${formatDateKey(new Date())}.csv`;
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
        <button
          onClick={downloadReport}
          className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          Download report (CSV)
        </button>
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
