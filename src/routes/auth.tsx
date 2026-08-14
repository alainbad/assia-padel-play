import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Assia Padel Court" },
      {
        name: "description",
        content:
          "Sign in to manage Assia Padel Court, or continue as a guest to book a slot without an account.",
      },
      { property: "og:title", content: "Sign in — Assia Padel Court" },
      {
        property: "og:description",
        content:
          "Sign in to manage Assia Padel Court, or continue as a guest to book a slot without an account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const ADMIN_EMAIL = "assiapadel@gmail.com";

// Supabase Auth needs an email under the hood. Usernames and phone numbers
// aren't real email addresses, so they're mapped to a synthetic
// "...@assiapadel.local" address — same trick sign-in already uses for
// usernames. This is an identifier, not a verified email or phone: nothing
// is actually sent to it.
function resolveEmail(identifier: string): string {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  if (value.toLowerCase() === "admin") return ADMIN_EMAIL;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${normalized}@assiapadel.local`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signupName, setSignupName] = useState("");
  const [signupIdentifier, setSignupIdentifier] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);
    setSignupNotice(null);

    const trimmedName = signupName.trim();
    const trimmed = signupIdentifier.trim();
    if (!trimmedName) {
      setSignupError("Enter your name.");
      return;
    }
    if (!trimmed) {
      setSignupError("Enter an email or phone number.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords don't match.");
      return;
    }

    const isEmail = trimmed.includes("@");
    setSignupLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: resolveEmail(trimmed),
        password: signupPassword,
        options: {
          data: {
            full_name: trimmedName,
            signup_identifier: trimmed,
            signup_identifier_type: isEmail ? "email" : "phone",
          },
        },
      });
      if (signUpError) {
        setSignupError(signUpError.message);
        return;
      }
      if (data.session) {
        const { data: isAdmin } = await supabase.rpc("is_admin");
        navigate({ to: isAdmin === true ? "/admin" : "/", replace: true });
        return;
      }
      // No session back usually means email confirmation is required. That
      // only works for real email addresses — a synthetic phone/username
      // identifier can never receive that email, so surface both cases.
      setSignupNotice(
        isEmail
          ? "Account created. Check your email to confirm, then sign in."
          : "Account created. Try signing in now — if it doesn't work, ask the court owner to disable email confirmation for phone/username sign-ups in Supabase.",
      );
      setMode("signin");
      setIdentifier(trimmed);
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === "signin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === "signup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "signin" ? (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signing in is only needed to manage the court. Guests can book without an account.
          </p>

          {signupNotice && (
            <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              {signupNotice}
            </p>
          )}

          <form onSubmit={handleSignIn} className="mt-8 space-y-4">
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
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Sign up
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account with your email or phone number. New accounts don't get
            court-management access automatically — the court owner grants that separately.
          </p>

          <form onSubmit={handleSignUp} className="mt-8 space-y-4">
            <div>
              <label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="signup-name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                autoComplete="name"
                required
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
                placeholder="Karim Haddad"
              />
            </div>

            <div>
              <label htmlFor="signup-identifier" className="text-sm font-medium text-foreground">
                Email or phone number
              </label>
              <input
                id="signup-identifier"
                value={signupIdentifier}
                onChange={(e) => setSignupIdentifier(e.target.value)}
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
                placeholder="you@example.com or +961 71 234 567"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            {signupError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {signupError}
              </p>
            )}

            <button
              type="submit"
              disabled={
                signupLoading ||
                !signupName ||
                !signupIdentifier ||
                !signupPassword ||
                !signupConfirm
              }
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {signupLoading ? "Creating account…" : "Sign up"}
            </button>
          </form>
        </>
      )}

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
