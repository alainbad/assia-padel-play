import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRegisteredUsers } from "@/lib/admin.functions";

type BookedUserSource = {
  name: string;
  phone: string;
  email?: string | null;
};

function tabClass(active: boolean): string {
  return `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-input text-foreground hover:bg-secondary"
  }`;
}

function csvCell(value: string | null | undefined): string {
  const v = value ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function UsersDirectory({ bookings }: { bookings: BookedUserSource[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"registered" | "booked">("registered");
  const fetchRegistered = useServerFn(listRegisteredUsers);

  const registeredQuery = useQuery({
    queryKey: ["registered-users"],
    queryFn: () => fetchRegistered(),
    enabled: open,
  });

  const bookedUsers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email?: string }>();
    for (const b of bookings) {
      if (!b.phone) continue;
      map.set(b.phone, { name: b.name, phone: b.phone, ...(b.email ? { email: b.email } : {}) });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (tab === "registered") {
      const users = registeredQuery.data ?? [];
      downloadCsv(`registered-users-${today}.csv`, [
        ["Name", "Email", "Phone", "Registered at"],
        ...users.map((u) => [u.name ?? "", u.email ?? "", u.phone ?? "", u.createdAt]),
      ]);
    } else {
      downloadCsv(`booked-users-${today}.csv`, [
        ["Name", "Phone", "Email"],
        ...bookedUsers.map((u) => [u.name, u.phone, u.email ?? ""]),
      ]);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Users Directory</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Registered accounts and everyone who has booked.
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          {open ? "Hide ▲" : "Show ▾"}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab("registered")}
              className={tabClass(tab === "registered")}
            >
              Registered ({registeredQuery.data?.length ?? "…"})
            </button>
            <button
              type="button"
              onClick={() => setTab("booked")}
              className={tabClass(tab === "booked")}
            >
              Booked ({bookedUsers.length})
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={
                tab === "registered"
                  ? !registeredQuery.data || registeredQuery.data.length === 0
                  : bookedUsers.length === 0
              }
              className="ml-auto rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-border">
            {tab === "registered" ? (
              registeredQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : registeredQuery.isError ? (
                <p className="p-4 text-sm text-destructive">Couldn't load registered users.</p>
              ) : registeredQuery.data && registeredQuery.data.length > 0 ? (
                <ul className="divide-y divide-border">
                  {registeredQuery.data.map((u) => (
                    <li key={u.id} className="px-3 py-2.5">
                      <p className="text-sm font-medium text-foreground">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email ?? u.phone ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No registered accounts yet.</p>
              )
            ) : bookedUsers.length > 0 ? (
              <ul className="divide-y divide-border">
                {bookedUsers.map((u) => (
                  <li key={u.phone} className="px-3 py-2.5">
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.phone}
                      {u.email ? ` · ${u.email}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
