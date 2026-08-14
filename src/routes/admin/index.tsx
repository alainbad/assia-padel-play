import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  LogOut,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminSetBookingStatus,
  adminSignOut,
  checkIsAdmin,
  getAdminSession,
  listAllBookings,
  onAdminAuthStateChange,
} from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ALL_SLOTS,
  COURT_NAME,
  formatDateKey,
  formatDisplayDate,
  formatTime12h,
  paymentLabel,
  type Booking,
} from "@/lib/bookings";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Assia Padel Court" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboardPage,
});

type AuthState = "checking" | "authorized" | "unauthorized";

function effectiveStatus(booking: Booking): Booking["status"] {
  if (booking.status !== "upcoming") return booking.status;
  const start = new Date(`${booking.date}T${booking.time}:00`).getTime();
  return start < Date.now() ? "completed" : "upcoming";
}

function statusVariant(
  status: Booking["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "upcoming") return "default";
  if (status === "completed") return "secondary";
  return "destructive";
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all");
  const [calendarDateKey, setCalendarDateKey] = useState(() => formatDateKey(new Date()));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthState("unauthorized");
      return;
    }
    let cancelled = false;
    (async () => {
      const session = await getAdminSession();
      const admin = session ? await checkIsAdmin() : false;
      if (cancelled) return;
      setAuthState(admin ? "authorized" : "unauthorized");
      if (!admin) navigate({ to: "/admin/login" });
    })();

    const unsubscribe = onAdminAuthStateChange((session) => {
      if (!session) {
        setAuthState("unauthorized");
        navigate({ to: "/admin/login" });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);

  const loadBookings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllBookings();
      setBookings(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Couldn't load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authState === "authorized") void loadBookings();
  }, [authState]);

  const handleLogout = async () => {
    await adminSignOut();
    navigate({ to: "/admin/login" });
  };

  const handleCancel = async (booking: Booking) => {
    try {
      await adminSetBookingStatus(booking.id, "cancelled");
      toast.success(`Cancelled booking ${booking.reference}`);
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel this booking.");
    }
  };

  const todayKey = formatDateKey(new Date());
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled"),
    [bookings],
  );

  const stats = useMemo(() => {
    const upcoming = activeBookings.filter((b) => effectiveStatus(b) === "upcoming");
    const today = activeBookings.filter((b) => b.date === todayKey);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekRevenue = upcoming
      .filter((b) => new Date(`${b.date}T00:00:00`) <= weekEnd)
      .reduce((sum, b) => sum + b.price, 0);
    return {
      upcomingCount: upcoming.length,
      todayCount: today.length,
      todayPlayers: today.reduce((sum, b) => sum + b.players, 0),
      weekRevenue,
    };
  }, [activeBookings, todayKey]);

  const filteredBookings = useMemo(() => {
    const list =
      statusFilter === "all"
        ? bookings
        : bookings.filter((b) => effectiveStatus(b) === statusFilter);
    return [...list].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [bookings, statusFilter]);

  const calendarBookings = useMemo(
    () => activeBookings.filter((b) => b.date === calendarDateKey),
    [activeBookings, calendarDateKey],
  );

  const shiftCalendarDate = (deltaDays: number) => {
    const next = new Date(`${calendarDateKey}T00:00:00`);
    next.setDate(next.getDate() + deltaDays);
    setCalendarDateKey(formatDateKey(next));
  };

  if (authState !== "authorized") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        {!isSupabaseConfigured ? (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">
              Admin dashboard not configured
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect Supabase in Lovable Cloud (or set <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>), run the migration in{" "}
              <code>supabase/migrations</code>, then create an admin user.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Checking your session…</p>
        )}
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary">
          ← Back to booking
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{COURT_NAME} · bookings overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadBookings()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut />
            Log out
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Upcoming bookings"
          value={stats.upcomingCount}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Today's bookings"
          value={stats.todayCount}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Players today"
          value={stats.todayPlayers}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Next 7 days revenue"
          value={`$${stats.weekRevenue}`}
        />
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "upcoming", "completed", "cancelled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No bookings in this view.
                    </TableCell>
                  </TableRow>
                )}
                {filteredBookings.map((b) => {
                  const status = effectiveStatus(b);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {formatDisplayDate(b.date)}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime12h(b.time)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.phone}</div>
                        {b.email && <div className="text-xs text-muted-foreground">{b.email}</div>}
                        {b.notes && (
                          <div className="mt-0.5 text-xs italic text-muted-foreground">
                            "{b.notes}"
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{b.players}</TableCell>
                      <TableCell>${b.price}</TableCell>
                      <TableCell>{paymentLabel(b.paymentMethod)}</TableCell>
                      <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(status)} className="capitalize">
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.status === "upcoming" && (
                          <Button variant="ghost" size="sm" onClick={() => void handleCancel(b)}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftCalendarDate(-1)}
              aria-label="Previous day"
            >
              <ChevronLeft />
            </Button>
            <input
              type="date"
              value={calendarDateKey}
              onChange={(e) => e.target.value && setCalendarDateKey(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftCalendarDate(1)}
              aria-label="Next day"
            >
              <ChevronRight />
            </Button>
            <button
              type="button"
              onClick={() => setCalendarDateKey(todayKey)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Today
            </button>
            <span className="ml-auto text-sm font-semibold text-foreground">
              {formatDisplayDate(calendarDateKey)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_SLOTS.map((slot) => {
              const booking = calendarBookings.find((b) => b.time === slot.time);
              if (!booking) {
                return (
                  <div
                    key={slot.time}
                    className="rounded-xl border border-dashed border-border bg-card/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{slot.label}</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${slot.price} · {slot.duration} min
                    </p>
                  </div>
                );
              }
              const status = effectiveStatus(booking);
              return (
                <div
                  key={slot.time}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{slot.label}</span>
                    <Badge variant={statusVariant(status)} className="capitalize">
                      {status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{booking.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.phone} · {booking.players} players
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${booking.price} · {paymentLabel(booking.paymentMethod)} · {booking.reference}
                  </p>
                  {booking.status === "upcoming" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => void handleCancel(booking)}
                    >
                      Cancel booking
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
