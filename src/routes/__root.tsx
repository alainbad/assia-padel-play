import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import logoAsset from "../assets/logo-assia.png.asset.json";
const logo = logoAsset.url;
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { AccountMenu } from "@/components/AccountMenu";
import { Toaster } from "@/components/ui/sonner";
import { formatDisplayDate, formatTime12h } from "@/lib/bookings";

const SITE_URL = "https://assiapadel.com";
const OG_IMAGE_URL = `${SITE_URL}${logo}`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Assia Padel Court" },
      { name: "description", content: "Book your outdoor padel court in Assia, Lebanon. Simple, fast, no account required." },
      { name: "author", content: "Assia Padel Court" },
      { property: "og:site_name", content: "Assia Padel Court" },
      { property: "og:title", content: "Assia Padel Court" },
      { property: "og:description", content: "Book your outdoor padel court in Assia, Lebanon. Simple, fast, no account required." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBookingsCount, setNewBookingsCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function refreshAuthState() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSignedIn(!!data.session);
      if (!data.session) {
        setIsAdmin(false);
        return;
      }
      const { data: adminCheck } = await supabase.rpc("is_admin");
      if (active) setIsAdmin(adminCheck === true);
    }

    void refreshAuthState();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshAuthState();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Live "new booking" notification for admins: Realtime delivery is itself
  // gated by the "Admins can view all bookings" RLS policy, so a non-admin
  // subscribing to this channel receives nothing even if this ran for them.
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin-new-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const booking = payload.new as { name: string; date: string; time: string };
          toast.success(
            `New booking: ${booking.name} — ${formatDisplayDate(booking.date)} at ${formatTime12h(booking.time)}`,
          );
          setNewBookingsCount((c) => c + 1);
          void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  useEffect(() => {
    if (location.pathname === "/admin") setNewBookingsCount(0);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm safe-area-inset-top">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground">
          <img src={logo} alt="Assia Padel Court logo" className="h-10 w-10 object-contain" width={40} height={40} />
          <span>Assia Padel</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/bookings" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground">
            My Bookings
          </Link>
          <Link to="/about" activeProps={{ className: "text-foreground" }} className="text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          {signedIn && (
            <Link to="/admin" activeProps={{ className: "text-foreground" }} className="relative text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
              {newBookingsCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {newBookingsCount}
                </span>
              )}
            </Link>
          )}
          <Link
            to="/"
            activeProps={{ className: "bg-primary/90" }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Book a Court
          </Link>
          <AccountMenu />
        </nav>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground md:hidden"
        >
          {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link to="/bookings" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary">
              My Bookings
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary">
              About
            </Link>
            {signedIn && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary"
              >
                Dashboard
                {newBookingsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                    {newBookingsCount}
                  </span>
                )}
              </Link>
            )}
            <Link to="/" onClick={() => setMenuOpen(false)} className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-base font-semibold text-primary-foreground">
              Book a Court
            </Link>
            {signedIn ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-base font-medium text-destructive hover:bg-destructive/5"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-secondary"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
