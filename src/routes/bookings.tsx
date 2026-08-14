import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getBookingsByStatus,
  cancelBooking,
  refreshMyBookings,
  formatDisplayDate,
  formatTime12h,
  paymentLabel,
  type Booking,
} from "@/lib/bookings";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Assia Padel Court" },
      {
        name: "description",
        content: "View and manage your upcoming padel court bookings at Assia Padel Court.",
      },
      { property: "og:title", content: "My Bookings — Assia Padel Court" },
      {
        property: "og:description",
        content: "View and manage your upcoming padel court bookings at Assia Padel Court.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const [bookings, setBookings] = useState<{ upcoming: Booking[]; previous: Booking[] }>({
    upcoming: [],
    previous: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBookings(getBookingsByStatus());
    setHydrated(true);
    refreshMyBookings()
      .then(() => setBookings(getBookingsByStatus()))
      .catch(() => {
        // Keep showing the local cache if the refresh fails (e.g. offline).
      });
  }, []);

  const handleCancel = async (id: string, reference: string) => {
    try {
      await cancelBooking(id, reference);
      setBookings(getBookingsByStatus());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't cancel this booking. Try again.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          My Bookings
        </h1>
        <Link
          to="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Book a Court
        </Link>
      </div>

      {!hydrated ? (
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming
            </h2>
            {bookings.upcoming.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-foreground">No upcoming bookings.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Book your first session and get on the court.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Previous
            </h2>
            {bookings.previous.length === 0 ? (
              <p className="text-sm text-muted-foreground">No previous bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.previous.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
}: {
  booking: Booking;
  onCancel?: (id: string, reference: string) => void;
}) {
  const isUpcoming = booking.status === "upcoming";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {formatDisplayDate(booking.date)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatTime12h(booking.time)} — {getEndTime(booking.time, booking.duration)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
          {booking.courtName}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Players</p>
          <p className="font-medium text-foreground">{booking.players}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Price</p>
          <p className="font-medium text-foreground">${booking.price}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium text-foreground">{booking.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Reference</p>
          <p className="font-medium text-foreground">{booking.reference}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Payment</p>
          <p className="font-medium text-foreground">{paymentLabel(booking.paymentMethod)}</p>
        </div>
      </div>

      {isUpcoming && onCancel && (
        <div className="mt-4 flex gap-2">
          <a
            href={`https://wa.me/96171234567?text=Hello, I have a booking at Assia Padel Court (${booking.reference})`}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            WhatsApp
          </a>
          <button
            onClick={() => onCancel(booking.id, booking.reference)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function getEndTime(startTime: string, duration: number): string {
  const parts = startTime.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const end = new Date();
  end.setHours(h, m + duration, 0, 0);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${end.getHours() % 12 || 12}:${pad(end.getMinutes())} ${end.getHours() >= 12 ? "PM" : "AM"}`;
}
