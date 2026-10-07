import { useState } from "react";
import { AdminManagement, BookingEditor } from "@/components/AdminManagement";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminRevenue } from "@/components/AdminRevenue";
import { UsersDirectory } from "@/components/UsersDirectory";
import {
  getIsAdmin,
  listAllBookings,
  setBookingStatus,
  setBookingPaymentStatus,
} from "@/lib/admin.functions";
import {
  DEPOSIT_AMOUNT,
  formatDisplayDate,
  formatTime12h,
  paymentLabel,
  paymentStatusLabel,
  type PaymentStatus,
} from "@/lib/bookings";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Assia Padel Court" },
      {
        name: "description",
        content:
          "Manage every reservation for Assia Padel Court: upcoming slots, contact details and payment method.",
      },
      { property: "og:title", content: "Admin dashboard — Assia Padel Court" },
      { property: "og:description", content: "Manage every reservation for Assia Padel Court." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
  errorComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-foreground">
        Couldn't load the dashboard
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
      Not found.
    </div>
  ),
});

function AdminPage() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { status?: "upcoming" | "completed" | "cancelled"; paymentStatus?: PaymentStatus }
    >
  >({});
  const [savingChanges, setSavingChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const stageStatus = ({
    id,
    status,
  }: {
    id: string;
    status: "upcoming" | "completed" | "cancelled";
  }) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], status } }));
  const stagePayment = ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], paymentStatus } }));
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(getIsAdmin);
  const fetchBookings = useServerFn(listAllBookings);
  const updateStatus = useServerFn(setBookingStatus);
  const updatePaymentStatus = useServerFn(setBookingPaymentStatus);

  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => fetchBookings(),
    enabled: adminQuery.data?.canManage === true,
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "upcoming" | "completed" | "cancelled" }) =>
      updateStatus({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const paymentMutation = useMutation({
    mutationFn: (vars: { id: string; paymentStatus: PaymentStatus }) =>
      updatePaymentStatus({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  async function saveReservationChanges() {
    setSavingChanges(true);
    setSaveMessage("");
    try {
      for (const [id, draft] of Object.entries(drafts)) {
        if (draft.status) await statusMutation.mutateAsync({ id, status: draft.status });
        if (draft.paymentStatus)
          await paymentMutation.mutateAsync({ id, paymentStatus: draft.paymentStatus });
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      setSaveMessage("Reservation changes saved.");
    } catch (e) {
      setSaveMessage(
        e instanceof Error
          ? e.message
          : "Could not save all changes. Remaining changes are still pending.",
      );
    } finally {
      setSavingChanges(false);
    }
  }
  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (adminQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!adminQuery.data?.canManage) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Staff only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account doesn't have access to the court dashboard.
        </p>
        <button
          onClick={handleSignOut}
          className="mt-6 rounded-lg border border-input px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Sign out
        </button>
      </div>
    );
  }

  const bookings = (bookingsQuery.data ?? []).map((b) => ({
    ...b,
    status: drafts[b.id]?.status ?? b.status,
    payment_status: drafts[b.id]?.paymentStatus ?? b.payment_status,
  }));
  const active = bookings.filter((b) => b.status !== "cancelled");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Court dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} active {active.length === 1 ? "reservation" : "reservations"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-input px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Sign out
        </button>
      </div>

      <AdminManagement userId={adminQuery.data.userId} role={adminQuery.data.role} />
      {(statusMutation.error || paymentMutation.error || bookingsQuery.error) && (
        <p role="alert" className="mt-4 text-destructive">
          {(statusMutation.error || paymentMutation.error || bookingsQuery.error)?.message}
        </p>
      )}
      {bookingsQuery.isLoading && (
        <p className="mt-8 text-sm text-muted-foreground">Loading reservations…</p>
      )}

      {!bookingsQuery.isLoading && (
        <div className="mt-6">
          <AdminRevenue bookings={bookings} />
        </div>
      )}

      {!bookingsQuery.isLoading && (
        <div className="mt-6">
          <UsersDirectory bookings={bookings} />
        </div>
      )}

      {!bookingsQuery.isLoading && (
        <div className="mt-6">
          <AdminCalendar bookings={bookings} />
        </div>
      )}

      {!bookingsQuery.isLoading && bookings.length === 0 && (
        <p className="mt-8 rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No reservations yet. New bookings from the website will appear here.
        </p>
      )}

      <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <span className="text-sm">
          {Object.keys(drafts).length} reservations with unsaved changes
        </span>
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={savingChanges || !Object.keys(drafts).length}
          onClick={() => void saveReservationChanges()}
        >
          {savingChanges ? "Saving…" : "Save changes"}
        </button>
        <button
          className="text-sm underline"
          disabled={savingChanges}
          onClick={() => setDrafts({})}
        >
          Discard changes
        </button>
      </div>
      {saveMessage && (
        <p role="status" className="mt-3 text-sm">
          {saveMessage}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-foreground">
                  {formatDisplayDate(b.date)} · {formatTime12h(b.time)}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {b.name} · {b.phone}
                  {b.email ? ` · ${b.email}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.players} players · ${b.price} ·{" "}
                  {paymentLabel(b.payment_method as "court" | "whish")} · Ref {b.reference}
                </p>
                {b.notes && <p className="mt-1 text-xs text-muted-foreground">Notes: {b.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    b.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : b.status === "completed"
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {b.status}
                </span>
                {b.status === "upcoming" && (
                  <button
                    onClick={() => stageStatus({ id: b.id, status: "cancelled" })}
                    disabled={savingChanges}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setEditing(editing === b.id ? null : b.id)}
              >
                Edit reservation
              </button>
              {b.status === "upcoming" && (
                <button
                  className="rounded-lg border px-3 py-2 text-sm"
                  disabled={savingChanges}
                  onClick={() => stageStatus({ id: b.id, status: "completed" })}
                >
                  Mark completed
                </button>
              )}
            </div>
            {editing === b.id && <BookingEditor booking={b} onDone={() => setEditing(null)} />}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  b.payment_status === "paid"
                    ? "bg-primary/10 text-primary"
                    : b.payment_status === "deposit"
                      ? "bg-secondary text-muted-foreground"
                      : "bg-destructive/10 text-destructive"
                }`}
              >
                {paymentStatusLabel(b.payment_status)}
              </span>
              {b.payment_status === "unpaid" && (
                <button
                  onClick={() => stagePayment({ id: b.id, paymentStatus: "deposit" })}
                  disabled={savingChanges}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  Deposit received (${DEPOSIT_AMOUNT})
                </button>
              )}
              {b.payment_status !== "paid" && (
                <button
                  onClick={() => stagePayment({ id: b.id, paymentStatus: "paid" })}
                  disabled={savingChanges}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Full amount received
                </button>
              )}
              {b.payment_status !== "unpaid" && (
                <button
                  onClick={() => stagePayment({ id: b.id, paymentStatus: "unpaid" })}
                  disabled={savingChanges}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
