import { canManageAccount, type SiteRole } from "@/lib/roles";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  prepareSiteImageUpload,
  getSiteSettings,
  saveSiteSettings,
  manageUser,
  getAvailability,
  setBlockedSlot,
  saveAdminBooking,
} from "@/lib/management.functions";
import { listRegisteredUsers } from "@/lib/admin.functions";
import { defaultContent, defaultSchedule, type SiteContent } from "@/lib/site-content";
import { supabase } from "@/integrations/supabase/client";
import { formatTime12h } from "@/lib/bookings";

const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const button =
  "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const secondary =
  "rounded-lg border border-input px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50";
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
function Notice({ message }: { message: string }) {
  return message ? (
    <p role="status" className="my-3 rounded-lg bg-secondary p-3 text-sm">
      {message}
    </p>
  ) : null;
}

export function AdminManagement({ userId, role }: { userId: string; role: SiteRole }) {
  const [tab, setTab] = useState("Content");
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold">Manage your court</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a section, edit the fields, then press Save changes to apply them.
      </p>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">
        {["Content", "Contact us", "Opening hours", "Schedule", "Users", "My password"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? button : secondary}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div hidden={!["Content", "Contact us", "Opening hours"].includes(tab)}>
        <ContentEditor section={tab} />
      </div>
      <div hidden={tab !== "Schedule"}>
        <ScheduleEditor />
      </div>
      <div hidden={tab !== "Users"}>
        <UserManager userId={userId} role={role} />
      </div>
      <div hidden={tab !== "My password"}>
        <OwnPassword />
      </div>
    </section>
  );
}
const labels: Record<string, string> = {
  heroTitle: "Hero heading",
  heroSubtitle: "Hero subtitle",
  bookingTitle: "Booking heading",
  bookingSubtitle: "Booking introduction",
  photosTitle: "Photos heading",
  photosSubtitle: "Photos introduction",
  aboutTitle: "About heading",
  aboutBody: "About text",
  aboutLink: "About link label",
  facilitiesTitle: "Facilities heading",
  locationTitle: "Locate us heading",
  locationAddress: "Address / location text",
  locationAlt: "Location image description",
  directionsUrl: "Google Maps directions URL",
  directionsLabel: "Directions button label",
  openingHoursTitle: "Opening hours heading",
  openingHoursText: "Displayed opening hours (leave blank to use the booking schedule)",
  contactEmail: "Contact email (optional)",
  contactTitle: "Contact heading",
  contactBody: "Contact text",
  phone: "Telephone number",
  whatsapp: "WhatsApp number (digits only)",
  whatsappLabel: "WhatsApp button label",
  copyright: "Footer text",
};
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const prepareUpload = useServerFn(prepareSiteImageUpload);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image under 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const upload = await prepareUpload({
        data: { type: file.type as "image/jpeg" | "image/png" | "image/webp" },
      });
      const { error } = await supabase.storage
        .from("site-images")
        .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
      if (error) throw error;
      onChange(upload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Field label={label}>
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      <img src={value} alt={label} className="max-h-40 rounded-lg object-contain" />
      <label className="block text-xs">
        {busy ? "Uploading…" : "Upload replacement image"}
        <input
          aria-label={`Upload ${label}`}
          disabled={busy}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
function ContentEditor({ section }: { section: string }) {
  const fetch = useServerFn(getSiteSettings);
  const query = useQuery({ queryKey: ["site-settings"], queryFn: () => fetch() });
  if (query.isPending) return <p>Loading content…</p>;
  if (query.isError) return <p role="alert">Could not load content. Please refresh.</p>;
  return (
    <ContentForm initial={query.data.content} schedule={query.data.schedule} section={section} />
  );
}
function ContentForm({
  initial,
  schedule,
  section,
}: {
  section: string;
  initial: SiteContent;
  schedule: typeof defaultSchedule;
}) {
  const [content, setContent] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = useServerFn(saveSiteSettings);
  const qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await save({ data: { content } });
      await qc.invalidateQueries({ queryKey: ["site-settings"] });
      setSaved(content);
      setMessage("Changes saved and applied to the website.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save content");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <span className="text-sm">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <button disabled={busy || !dirty} className={button}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
      <h3 className="font-display text-lg font-semibold">{section}</h3>
      {section === "Opening hours" && (
        <p className="text-sm text-muted-foreground">
          These hours appear on the homepage and About page. Use Schedule to change bookable start
          times and prices.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Edit text and photos below. Save to update the website. Text embedded in a photo can be
        changed by uploading an edited image.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(labels)
          .filter(([key]) =>
            section === "Contact us"
              ? [
                  "contactTitle",
                  "contactBody",
                  "phone",
                  "whatsapp",
                  "whatsappLabel",
                  "contactEmail",
                ].includes(key)
              : section === "Opening hours"
                ? key.startsWith("openingHours")
                : !key.startsWith("openingHours") &&
                  ![
                    "contactTitle",
                    "contactBody",
                    "phone",
                    "whatsapp",
                    "whatsappLabel",
                    "contactEmail",
                  ].includes(key),
          )
          .map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                className={input}
                rows={key.endsWith("Body") ? 4 : 2}
                required={!["openingHoursText", "contactEmail"].includes(key)}
                value={content[key as keyof SiteContent] as string}
                onChange={(e) => setContent({ ...content, [key]: e.target.value })}
              />
            </Field>
          ))}
      </div>
      <div hidden={section !== "Content"} className="space-y-5">
        <Field label="Facilities (one per line)">
          <textarea
            className={input}
            rows={5}
            value={content.facilities.join("\n")}
            onChange={(e) => setContent({ ...content, facilities: e.target.value.split("\n") })}
          />
        </Field>
        <ImageField
          label="Locate us photo"
          value={content.locationImage}
          onChange={(url) => setContent({ ...content, locationImage: url })}
        />
        {(["heroImages", "courtImages"] as const).map((key) => (
          <div key={key} className="space-y-3">
            <h3 className="font-semibold">
              {key === "heroImages" ? "Homepage slideshow" : "Court gallery"}
            </h3>
            {content[key].map((img, i) => (
              <div key={i} className="space-y-2">
                <ImageField
                  label={`Photo ${i + 1}`}
                  value={img.url}
                  onChange={(url) =>
                    setContent({
                      ...content,
                      [key]: content[key].map((v, j) => (i === j ? { ...v, url } : v)),
                    })
                  }
                />
                <Field label="Image description">
                  <input
                    className={input}
                    value={img.alt}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        [key]: content[key].map((v, j) =>
                          i === j ? { ...v, alt: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </Field>
                <button
                  type="button"
                  className={secondary}
                  disabled={content[key].length === 1}
                  onClick={() =>
                    setContent({ ...content, [key]: content[key].filter((_, j) => j !== i) })
                  }
                >
                  Remove photo
                </button>
              </div>
            ))}
            <button
              type="button"
              className={secondary}
              onClick={() =>
                setContent({
                  ...content,
                  [key]: [
                    ...content[key],
                    { url: content.locationImage, alt: "Assia Padel Court" },
                  ],
                })
              }
            >
              Add photo
            </button>
          </div>
        ))}
      </div>
      <Notice message={message} />
      <button disabled={busy || !dirty} className={button}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
function UserManager({ userId, role }: { userId: string; role: SiteRole }) {
  const fetch = useServerFn(listRegisteredUsers);
  const act = useServerFn(manageUser);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["registered-users"], queryFn: () => fetch() });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "supervisor",
  });
  const [selected, setSelected] = useState<{
    id: string;
    action: "password" | "role" | "delete";
  } | null>(null);
  const [password, setPassword] = useState("");
  const [assignedRole, setAssignedRole] = useState<"user" | "supervisor">("user");
  type Action =
    | {
        action: "create";
        name: string;
        email: string;
        password: string;
        role: "user" | "supervisor";
      }
    | { action: "password"; id: string; password: string }
    | { action: "role"; id: string; role: "user" | "supervisor" }
    | { action: "delete"; id: string };
  async function run(data: Action) {
    setBusy(true);
    setMessage("");
    try {
      await act({ data });
      setMessage("Account changes saved.");
      setSelected(null);
      setPassword("");
      if (data.action === "create") setForm({ name: "", email: "", password: "", role: "user" });
      await qc.invalidateQueries({ queryKey: ["registered-users"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Your role: <strong>{role}</strong>. Only admins can create accounts and assign roles. Admin
        accounts are protected.
      </p>
      {role === "admin" && (
        <form
          className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: "create", ...form });
          }}
        >
          <h3 className="font-semibold sm:col-span-2">Create user or supervisor</h3>
          {(["name", "email", "password"] as const).map((key) => (
            <Field
              key={key}
              label={
                key === "password"
                  ? "Initial password (12+ characters)"
                  : key === "name"
                    ? "Full name"
                    : "Email"
              }
            >
              <input
                required
                type={key === "name" ? "text" : key}
                minLength={key === "password" ? 12 : undefined}
                autoComplete="off"
                className={input}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="Role">
            <select
              className={input}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "user" | "supervisor" })}
            >
              <option value="user">User</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </Field>
          <button disabled={busy} className={button}>
            Save changes · create account
          </button>
        </form>
      )}
      <Notice message={message} />
      <Field label="Search users">
        <input
          className={input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email or phone"
        />
      </Field>
      {query.isPending && <p>Loading users…</p>}
      {query.isError && <p role="alert">Could not load users.</p>}
      {query.data
        ?.filter((u) =>
          `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase()),
        )
        .map((u) => (
          <div key={u.id} className="space-y-3 border-t border-border py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {u.name || "User"}
                  {u.id === userId ? " (you)" : ""}{" "}
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">{u.role}</span>
                </p>
                <p className="text-sm text-muted-foreground">{u.email || u.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["password", "role", "delete"] as const)
                  .filter((action) => canManageAccount(role, u.role, action, u.id === userId))
                  .map((action) => (
                    <button
                      key={action}
                      disabled={busy}
                      className={secondary}
                      onClick={() => {
                        setSelected({ id: u.id, action });
                        setPassword("");
                        setAssignedRole(u.role === "supervisor" ? "supervisor" : "user");
                      }}
                    >
                      {action === "password"
                        ? "Reset password"
                        : action === "role"
                          ? "Change role"
                          : "Remove"}
                    </button>
                  ))}
              </div>
            </div>
            {selected?.id === u.id && (
              <form
                className="flex flex-wrap items-end gap-3 rounded-lg bg-secondary p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    selected.action === "delete" &&
                    !window.confirm(
                      `Permanently delete ${u.email || u.phone}? This cannot be undone.`,
                    )
                  )
                    return;
                  void run(
                    selected.action === "password"
                      ? { action: "password", id: u.id, password }
                      : selected.action === "role"
                        ? { action: "role", id: u.id, role: assignedRole }
                        : { action: "delete", id: u.id },
                  );
                }}
              >
                {selected.action === "password" ? (
                  <Field label="New password (12+ characters)">
                    <input
                      type="password"
                      required
                      minLength={12}
                      autoComplete="new-password"
                      className={input}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                ) : selected.action === "role" ? (
                  <Field label="New role">
                    <select
                      className={input}
                      value={assignedRole}
                      onChange={(e) => setAssignedRole(e.target.value as "user" | "supervisor")}
                    >
                      <option value="user">User</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </Field>
                ) : (
                  <p className="text-sm">This will permanently delete the account.</p>
                )}
                <button disabled={busy} className={button}>
                  Save changes
                </button>
                <button type="button" className={secondary} onClick={() => setSelected(null)}>
                  Cancel
                </button>
              </form>
            )}
          </div>
        ))}
    </div>
  );
}
function OwnPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) {
          setMessage("Passwords do not match.");
          return;
        }
        setBusy(true);
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          setPassword("");
          setConfirm("");
          setMessage("Your password was changed.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Password update failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="New password">
        <input
          required
          minLength={12}
          type="password"
          autoComplete="new-password"
          className={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm password">
        <input
          required
          type="password"
          autoComplete="new-password"
          className={input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Notice message={message} />
      <button className={button} disabled={busy}>
        Save changes · password
      </button>
    </form>
  );
}
function ScheduleEditor() {
  const fetch = useServerFn(getSiteSettings);
  const query = useQuery({ queryKey: ["site-settings"], queryFn: () => fetch() });
  if (query.isPending) return <p>Loading schedule…</p>;
  if (query.isError) return <p>Could not load schedule.</p>;
  return <ScheduleForm settings={query.data} />;
}
function ScheduleForm({
  settings,
}: {
  settings: { content: SiteContent; schedule: typeof defaultSchedule };
}) {
  const [schedule, setSchedule] = useState(settings.schedule);
  const [times, setTimes] = useState(schedule.times.join(", "));
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" }),
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSiteSettings);
  const block = useServerFn(setBlockedSlot);
  const fetch = useServerFn(getAvailability);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["availability", date],
    queryFn: () => fetch({ data: { date } }),
  });
  const [pendingBlocks, setPendingBlocks] = useState<
    Record<string, { date: string; time: string; blocked: boolean }>
  >({});
  function toggle(time: string, blocked: boolean) {
    setPendingBlocks((prev) => ({ ...prev, [`${date}/${time}`]: { date, time, blocked } }));
  }
  async function saveBlocks() {
    setBusy(true);
    try {
      for (const [key, value] of Object.entries(pendingBlocks)) {
        await block({ data: value });
        setPendingBlocks((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      await qc.invalidateQueries({ queryKey: ["availability"] });
      setMessage("Slot changes saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save({
              data: {
                schedule: {
                  ...schedule,
                  times: times
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .sort(),
                },
              },
            });
            await qc.invalidateQueries({ queryKey: ["site-settings"] });
            setMessage(
              "Opening times and pricing saved. Existing bookings retain their booked price and duration.",
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not save schedule");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Start times, separated by commas (24-hour)">
          <textarea
            className={input}
            rows={3}
            value={times}
            onChange={(e) => setTimes(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (minutes)">
            <input
              className={input}
              type="number"
              min={30}
              max={240}
              value={schedule.duration}
              onChange={(e) => setSchedule({ ...schedule, duration: Number(e.target.value) })}
            />
          </Field>
          <Field label="Price ($)">
            <input
              className={input}
              type="number"
              min={0}
              step="0.01"
              value={schedule.price}
              onChange={(e) => setSchedule({ ...schedule, price: Number(e.target.value) })}
            />
          </Field>
        </div>
        <button disabled={busy} className={button}>
          Save changes · opening times and prices
        </button>
      </form>
      <Notice message={message} />
      <div>
        <h3 className="font-semibold">Block or reopen slots</h3>
        <p className="my-2 text-sm text-muted-foreground">
          Court times are in Lebanon time. Use the reservation controls below to change an existing
          booking.
        </p>
        <Field label="Date">
          <input
            type="date"
            required
            className={input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        {q.isError ? (
          <p role="alert">Could not load availability.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {settings.schedule.times.map((time) => {
              const blocked =
                pendingBlocks[`${date}/${time}`]?.blocked ?? q.data?.blocked.includes(time);
              const start = Date.parse(`${date}T${time}:00Z`);
              const booked = q.data?.bookings.some((b) => {
                const bs = Date.parse(`${b.date}T${b.time}:00Z`);
                return (
                  bs < start + settings.schedule.duration * 60000 && bs + b.duration * 60000 > start
                );
              });
              return (
                <button
                  key={time}
                  disabled={busy || q.isPending || booked}
                  className={blocked ? button : secondary}
                  onClick={() => void toggle(time, !blocked)}
                >
                  {formatTime12h(time)}
                  <span className="block text-xs">
                    {booked ? "Booked" : blocked ? "Blocked · reopen" : "Open · block"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button
          disabled={busy || !Object.keys(pendingBlocks).length}
          className={button}
          onClick={() => void saveBlocks()}
        >
          Save changes · blocked slots ({Object.keys(pendingBlocks).length})
        </button>
        <button
          className={secondary}
          disabled={busy || !Object.keys(pendingBlocks).length}
          onClick={() => setPendingBlocks({})}
        >
          Discard slot changes
        </button>
      </div>
      <BookingEditor />
    </div>
  );
}
export function BookingEditor({
  booking,
  onDone,
}: {
  booking?: {
    id: string;
    date: string;
    time: string;
    duration: number;
    name: string;
    phone: string;
    email: string | null;
    players: number;
    notes: string | null;
    price: number;
    payment_method: string;
  };
  onDone?: () => void;
}) {
  const empty = {
    date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" }),
    time: "08:00",
    duration: 90,
    name: "",
    phone: "",
    email: "",
    players: 4,
    notes: "",
    price: 20,
    payment_method: "court" as "court" | "whish",
  };
  const [form, setForm] = useState(
    booking
      ? {
          ...booking,
          email: booking.email ?? "",
          notes: booking.notes ?? "",
          payment_method: booking.payment_method as "court" | "whish",
        }
      : empty,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = useServerFn(saveAdminBooking);
  const qc = useQueryClient();
  return (
    <form
      className="space-y-3 rounded-xl border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await save({ data: form });
          await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
          await qc.invalidateQueries({ queryKey: ["availability"] });
          setMessage("Reservation saved.");
          if (!booking) setForm(empty);
          onDone?.();
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not save booking");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">{booking ? "Edit reservation" : "Add manual reservation"}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            "date",
            "time",
            "duration",
            "name",
            "phone",
            "email",
            "players",
            "price",
            "notes",
          ] as const
        ).map((k) => (
          <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
            <input
              className={input}
              required={!["email", "notes"].includes(k)}
              type={
                ["duration", "players", "price"].includes(k)
                  ? "number"
                  : k === "date" || k === "time" || k === "email"
                    ? k
                    : "text"
              }
              value={form[k]}
              onChange={(e) =>
                setForm({
                  ...form,
                  [k]: ["duration", "players", "price"].includes(k)
                    ? Number(e.target.value)
                    : e.target.value,
                })
              }
            />
          </Field>
        ))}
        <Field label="Payment method">
          <select
            className={input}
            value={form.payment_method}
            onChange={(e) =>
              setForm({ ...form, payment_method: e.target.value as "court" | "whish" })
            }
          >
            <option value="court">At court</option>
            <option value="whish">Whish</option>
          </select>
        </Field>
      </div>
      <Notice message={message} />
      <button className={button} disabled={busy}>
        {busy ? "Saving…" : "Save changes · reservation"}
      </button>
    </form>
  );
}
