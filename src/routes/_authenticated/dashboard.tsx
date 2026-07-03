import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Flame,
  Trophy,
  BookOpen,
  Mic,
  Target,
  ArrowRight,
  Sparkles,
  Calendar,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Fluenta" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,xp,streak_days,coins,english_level")
        .eq("id", user.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: threads } = useQuery({
    queryKey: ["recent_threads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("id,title,scenario,updated_at")
        .order("updated_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const stats = [
    { label: "Current Streak", value: `${profile?.streak_days ?? 0} 🔥`, icon: Flame, tint: "from-orange-500/20 to-orange-500/5", color: "text-orange-500" },
    { label: "Total XP", value: profile?.xp ?? 0, icon: Trophy, tint: "from-primary/20 to-primary/5", color: "text-primary" },
    { label: "Coins", value: profile?.coins ?? 0, icon: Sparkles, tint: "from-secondary/20 to-secondary/5", color: "text-secondary" },
    { label: "Grammar Score", value: "92%", icon: Target, tint: "from-success/20 to-success/5", color: "text-success" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8 animate-fade-up">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""} 👋</p>
          <h1 className="mt-1 truncate font-display text-3xl font-bold sm:text-4xl">Let's keep learning</h1>
        </div>
        <Link
          to="/tutor"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
        >
          <Bot className="h-4 w-4" /> Talk to AI
        </Link>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-3xl glass p-5 shadow-soft`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.tint} opacity-60`} />
            <div className="relative">
              <div className={`grid h-10 w-10 place-items-center rounded-2xl bg-card ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-2xl font-bold font-display">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Lesson */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-glow lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5" /> Today's Lesson
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Order at a cafe like a local</h2>
            <p className="mt-2 max-w-md text-sm text-white/85">
              Practice a real conversation with your AI barista — new vocabulary, polite phrasing, and pronunciation feedback.
            </p>
            <Link
              to="/tutor"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft transition hover:brightness-95"
            >
              Start now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-3">
          {[
            { to: "/scenarios", icon: Mic, title: "Speaking Practice", desc: "Role-play real scenarios" },
            { to: "/grammar", icon: BookOpen, title: "Grammar Lesson", desc: "Tenses, articles, more" },
            { to: "/quizzes", icon: TrendingUp, title: "Take a Quiz", desc: "Test your knowledge" },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="flex items-center gap-4 rounded-2xl glass p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white shadow-glow">
                <q.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{q.title}</div>
                <div className="truncate text-xs text-muted-foreground">{q.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent conversations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Recent conversations</h2>
          <Link to="/tutor" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {threads && threads.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                to="/tutor/$threadId"
                params={{ threadId: t.id }}
                className="group rounded-2xl glass p-4 shadow-soft transition hover:shadow-glass"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(t.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl glass p-8 text-center shadow-soft">
            <Bot className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">No conversations yet.</p>
            <Link
              to="/tutor"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Start your first chat <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
