import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function avatarUrlFor(user: User): string | undefined {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const url = metadata?.["avatar_url"];
  return typeof url === "string" ? url : undefined;
}

function initialFor(user: User): string {
  return user.email?.charAt(0).toUpperCase() ?? "?";
}

export function AccountMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="Sign in"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <UserIcon className="h-4 w-4" />
      </Link>
    );
  }

  const avatarUrl = avatarUrlFor(user);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-secondary text-sm font-semibold text-foreground hover:opacity-90"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialFor(user)
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <p className="truncate px-2.5 py-1.5 text-xs text-muted-foreground">{user.email}</p>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
