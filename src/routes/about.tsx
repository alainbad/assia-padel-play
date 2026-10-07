import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettings } from "@/lib/management.functions";
import { defaultContent, defaultSchedule } from "@/lib/site-content";
import { formatTime12h, getSlotEndTime } from "@/lib/bookings";
import { createFileRoute, Link } from "@tanstack/react-router";
import hero1 from "@/assets/hero-1.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Court — Assia Padel Court" },
      {
        name: "description",
        content:
          "Learn about Assia Padel Court, a single outdoor padel court in the heart of a Lebanese mountain village.",
      },
      { property: "og:title", content: "About the Court — Assia Padel Court" },
      {
        property: "og:description",
        content:
          "Learn about Assia Padel Court, a single outdoor padel court in the heart of a Lebanese mountain village.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const fetch = useServerFn(getSiteSettings);
  const query = useQuery({ queryKey: ["site-settings"], queryFn: () => fetch() });
  const content = query.data?.content ?? defaultContent;
  const schedule = query.data?.schedule ?? defaultSchedule;
  const facilities = content.facilities;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {content.aboutTitle}
      </h1>

      <div className="mt-6 overflow-hidden rounded-2xl">
        <img
          src={content.courtImages[0]?.url}
          alt="Outdoor padel court at Assia Padel"
          className="h-56 w-full object-cover sm:h-72"
          width={1200}
          height={800}
        />
      </div>

      <div className="mt-6 whitespace-pre-line text-foreground">{content.aboutBody}</div>

      <section className="mt-8">
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

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {content.openingHoursTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {content.openingHoursText ||
            `Daily: ${formatTime12h(schedule.times[0]!)} – ${getSlotEndTime(schedule.times.at(-1)!, schedule.duration)}. Last booking starts at ${formatTime12h(schedule.times.at(-1)!)}.`}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Location</h2>
        <p className="mt-2 text-sm text-muted-foreground">{content.locationAddress}</p>
        <a
          href={content.directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {content.directionsLabel}
        </a>
      </section>

      <section className="mt-8">
        {content.contactEmail && (
          <a className="text-primary" href={`mailto:${content.contactEmail}`}>
            {content.contactEmail}
          </a>
        )}
        <h2 className="font-display text-lg font-semibold text-foreground">
          {content.contactTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{content.contactBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/${content.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            WhatsApp
          </a>
          <a
            href={`tel:${content.phone.replace(/[^+0-9]/g, "")}`}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Call {content.phone}
          </a>
        </div>
      </section>

      <div className="mt-10">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Book a Court
        </Link>
      </div>
    </div>
  );
}
