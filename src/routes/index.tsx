import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-padel.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assia Padel Court | Premium Courts & Coaching" },
      {
        name: "description",
        content:
          "Book a world-class padel experience at Assia Padel Court. Modern floodlit courts, professional coaching, and flexible memberships for every player level.",
      },
      {
        property: "og:title",
        content: "Assia Padel Court | Premium Courts & Coaching",
      },
      {
        property: "og:description",
        content:
          "Book a world-class padel experience at Assia Padel Court. Modern floodlit courts, professional coaching, and flexible memberships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <Courts />
        <Pricing />
        <Location />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            A
          </span>
          <span className="text-foreground">Assia</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <a href="#courts" className="text-muted-foreground transition-colors hover:text-foreground">
            Courts
          </a>
          <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#location" className="text-muted-foreground transition-colors hover:text-foreground">
            Location
          </a>
          <a href="#contact" className="text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>

        <a
          href="#contact"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
        >
          Book a Court
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Assia Padel Court at night with professional floodlights and a vibrant blue court"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <div className="max-w-3xl animate-[slide-up_0.8s_ease-out_forwards]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Now open for bookings
          </div>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Play Padel <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
              Under the Lights
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Premium floodlit courts, professional coaching, and a vibrant community. Experience padel the way it should be at Assia Padel Court.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20"
            >
              Reserve Your Court
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </a>
            <a
              href="#courts"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Explore Courts
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <div className="h-10 w-6 rounded-full border-2 border-white/20 p-1">
          <div className="h-2 w-full rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "4", label: "Pro Courts" },
    { value: "12", label: "Pro Coaches" },
    { value: "24/7", label: "Lighting" },
    { value: "500+", label: "Active Members" },
  ];

  return (
    <section className="border-y border-white/10 bg-secondary/50 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{stat.value}</div>
              <div className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "Floodlit Courts",
      description: "Four professional-grade padel courts with LED lighting, so you can play day or night in perfect visibility.",
      icon: CourtIcon,
    },
    {
      title: "Expert Coaching",
      description: "Learn from certified coaches with programs for beginners, intermediate players, and competitive athletes.",
      icon: CoachIcon,
    },
    {
      title: "Premium Facilities",
      description: "Locker rooms, racket rentals, pro shop, and a comfortable lounge area for relaxing between matches.",
      icon: FacilityIcon,
    },
    {
      title: "Community Events",
      description: "Join weekly tournaments, social mixers, and clinics designed to connect players of every level.",
      icon: CommunityIcon,
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for Every Player
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From your first rally to your next tournament, we have the courts, coaches, and community to elevate your game.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/10 bg-card p-8 transition-all hover:border-primary/30 hover:bg-card/80"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Courts() {
  const courts = [
    { name: "Court One", type: "Indoor", surface: "Premium Blue Turf", feature: "Climate Controlled" },
    { name: "Court Two", type: "Outdoor", surface: "Premium Blue Turf", feature: "Floodlit Until Midnight" },
    { name: "Court Three", type: "Outdoor", surface: "Premium Blue Turf", feature: "Floodlit Until Midnight" },
    { name: "Court Four", type: "Indoor", surface: "Premium Blue Turf", feature: "Climate Controlled" },
  ];

  return (
    <section id="courts" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Our Courts</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four meticulously maintained courts designed for competitive play, casual rallies, and everything in between.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courts.map((court) => (
            <div
              key={court.name}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-card to-secondary p-6"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <CourtIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{court.name}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground">{court.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface</span>
                    <span className="font-medium text-foreground">{court.surface}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Feature</span>
                    <span className="font-medium text-foreground">{court.feature}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Drop-In",
      price: "35",
      period: "per hour",
      description: "Perfect for casual play and trying the club before committing.",
      features: ["Court rental only", "Racket rental available", "Book up to 7 days ahead"],
      cta: "Book a Court",
      highlighted: false,
    },
    {
      name: "Member",
      price: "89",
      period: "per month",
      description: "Our most popular plan for regular players who want value and flexibility.",
      features: ["Discounted court rates", "Priority booking window", "Free racket rental", "Member-only events"],
      cta: "Become a Member",
      highlighted: true,
    },
    {
      name: "Elite",
      price: "199",
      period: "per month",
      description: "The full Assia experience for competitive and dedicated players.",
      features: ["Unlimited court access", "Monthly coaching session", "Guest passes", "Pro shop discounts"],
      cta: "Go Elite",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple Pricing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your game. All plans include access to our premium facilities.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all hover:-translate-y-1 ${
                plan.highlighted
                  ? "border-primary bg-gradient-to-b from-primary/10 to-card shadow-2xl shadow-primary/10"
                  : "border-white/10 bg-card hover:border-white/20"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">${plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`mt-8 block w-full rounded-full px-5 py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-white/20 bg-white/5 text-foreground hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Location() {
  return (
    <section id="location" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Visit Assia</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Conveniently located with ample parking and easy access. Stop by for a tour or book your first session online.
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LocationIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Address</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    12 Sports District, Padel Avenue<br />
                    Dubai, United Arab Emirates
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClockIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Opening Hours</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sunday – Saturday: 6:00 AM – 12:00 AM<br />
                    Coaching: 7:00 AM – 10:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PhoneIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Contact</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    +971 4 123 4567<br />
                    hello@assiapadel.com
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 lg:aspect-auto lg:h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <div className="text-center">
                <LocationIcon className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Interactive map coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 px-6 py-20 text-center sm:px-16 sm:py-24">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Ready to Play?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Book your first court today and experience the best padel facility in the city.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-foreground px-8 py-4 text-base font-semibold text-background transition-all hover:bg-foreground/90"
              >
                Book Your First Court
              </a>
              <a
                href="tel:+97141234567"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-primary-foreground backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-secondary py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              A
            </span>
            <span className="text-foreground">Assia Padel Court</span>
          </a>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Assia Padel Court. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Instagram</a>
            <a href="#" className="hover:text-foreground">WhatsApp</a>
            <a href="#" className="hover:text-foreground">Email</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Inline SVG icons — no extra dependency needed.
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CourtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 12h20" />
      <path d="M12 4v16" />
      <path d="M7 4v16" />
      <path d="M17 4v16" />
    </svg>
  );
}

function CoachIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function FacilityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 9h4" />
      <path d="M10 13h4" />
    </svg>
  );
}

function CommunityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
