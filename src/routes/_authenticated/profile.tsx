import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Profile — Assia Padel Court" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function avatarUrlFrom(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const url = metadata?.["avatar_url"];
  return typeof url === "string" ? url : undefined;
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const userId = userQuery.data?.id;
    if (!file || !userId) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: `${urlData.publicUrl}?t=${Date.now()}` },
      });
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload photo. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const user = userQuery.data;
  const avatarUrl = avatarUrlFrom(user?.user_metadata as Record<string, unknown> | undefined);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>

      <div className="mt-6 flex flex-col items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-secondary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !user}
          className="mt-3 rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">{user?.email}</p>

      <div className="mt-8 flex flex-col gap-2">
        <Link
          to="/admin"
          className="rounded-lg border border-input px-4 py-2.5 text-center text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Back to dashboard
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-destructive hover:bg-destructive/5"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
