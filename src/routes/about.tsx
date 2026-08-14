import { createFileRoute, Link } from "@tanstack/react-router";
import hero1 from "@/assets/hero-1.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Court — Assia Padel Court" },
      { name: "description", content: "Learn about Assia Padel Court, a single outdoor padel court in the heart of a Lebanese mountain village." },
      { property: "og:title", content: "About the Court — Assia Padel Court" },
      { property: "og:description", content: "Learn about Assia Padel Court, a single outdoor padel court in the heart of a Lebanese mountain village." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const facilities = [
    "Outdoor court with floodlights",
    "Parking on-site",
    "Racket & ball rental",
    "Drinks available",
    "Seating area",
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">About the Court</h1>

      <div className="mt-6 overflow-hidden rounded-2xl">
        <img src={hero1.url} alt="Outdoor padel court at Assia Padel" className="h-56 w-full object-cover sm:h-72" width={1200} height={800} />
      </div>

      <div className="mt-6 space-y-4 text-foreground">
        <p>
          Assia Padel Court is a single outdoor padel court built for the village and everyone who loves the game.
        </p>
        <p>
          Set in the mountains of Lebanon, the court was designed to feel relaxed, local, and welcoming — whether you are booking a casual evening game with friends or a weekend rally with family.
        </p>
        <p>
          We keep things simple. No memberships, no complicated apps. Just check availability, pick a time, and show up ready to play.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Facilities</h2>
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
        <h2 className="font-display text-lg font-semibold text-foreground">Opening Hours</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Daily: 8:00 AM – 11:30 PM<br />
          Last booking starts at 11:00 PM
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Location</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Assia, Batroun District, Lebanon
        </p>
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=34.225754,35.779507"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Get Directions
        </a>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          WhatsApp or call us for any questions.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://wa.me/96171234567"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            WhatsApp
          </a>
          <a
            href="tel:+96171234567"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Call +961 71 234 567
          </a>
        </div>
      </section>

      <div className="mt-10">
        <Link to="/" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Book a Court
        </Link>
      </div>
    </div>
  );
}
