import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.user.id).maybeSingle();
      return { ...data, email: user.user.email };
    },
  });

  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setLevel(profile.english_level ?? "beginner");
      setGoal(profile.goal ?? "");
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, english_level: level, goal })
      .eq("id", user.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 sm:p-8 animate-fade-up">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold">Your profile</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{profile?.email}</p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <User className="h-6 w-6" />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "XP", value: profile?.xp ?? 0 },
          { label: "Streak", value: `${profile?.streak_days ?? 0} 🔥` },
          { label: "Coins", value: profile?.coins ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl glass p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl glass p-6 shadow-glass">
        <h2 className="font-display text-lg font-bold">Settings</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">English level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Learning goal</label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Pass IELTS with 7.5, or land a job at a US company."
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
