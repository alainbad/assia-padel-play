import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Assia Padel Court" },
      { name: "description", content: "Sign in to manage Assia Padel Court, or continue as a guest to book a slot without an account." },
      { property: "og:title", content: "Sign in — Assia Padel Court" },
      { property: "og:description", content: "Sign in to manage Assia Padel Court, or continue as a guest to book a slot without an account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const ADMIN_EMAIL = "assiapadel@gmail.com";

function resolveEmail(identifier: string): string {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  if (value.toLowerCase() === "admin") return ADMIN_EMAIL;
  return `${value.toLowerCase()}@assiapadel.local`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolveEmail(identifier),
        password,
      });
      if (signInError) {
        setError("Those details didn't match. Check your username and password.");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin === true) {
        navigate({ to: "/admin", replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signing in is only needed to manage the court. Guests can book without an account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="identifier" className="text-sm font-medium text-foreground">
            Username or email
          </label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
            placeholder="Admin"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !identifier || !password}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        to="/"
        className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-base font-semibold text-foreground transition-colors hover:bg-secondary"
      >
        Continue as guest
      </Link>
    </div>
  );
}
