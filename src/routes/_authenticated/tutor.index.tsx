import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getScenario, SCENARIOS } from "@/lib/scenarios";
import { Bot, Plus, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor/")({
  head: () => ({
    meta: [{ title: "AI Tutor — Fluenta" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorHome,
});

function TutorHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("id,title,scenario,updated_at")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const startNew = async (scenarioId = "free_chat") => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const scenario = getScenario(scenarioId);
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.user.id,
        title: `${scenario.emoji} ${scenario.title}`,
        scenario: scenario.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not start conversation");
      return;
    }
    qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/tutor/$threadId", params: { threadId: data.id } });
  };

  const quickStart = SCENARIOS.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-4 sm:p-8 animate-fade-up">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI English Tutor
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Start a conversation</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a scenario or start free chat. Your tutor remembers context and gently corrects you.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => startNew("free_chat")}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New free chat
        </button>
        <Link
          to="/scenarios"
          className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold shadow-soft"
        >
          <MessageSquare className="h-4 w-4" /> Browse all scenarios
        </Link>
      </div>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold">Quick start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickStart.map((s) => (
            <button
              key={s.id}
              onClick={() => startNew(s.id)}
              className="group relative overflow-hidden rounded-2xl glass p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
            >
              <div className="text-3xl">{s.emoji}</div>
              <div className="mt-3 font-semibold">{s.title}</div>
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold">Your conversations</h2>
        {threads && threads.length > 0 ? (
          <ul className="space-y-2">
            {threads.map((t) => {
              const scenario = getScenario(t.scenario);
              return (
                <li key={t.id}>
                  <Link
                    to="/tutor/$threadId"
                    params={{ threadId: t.id }}
                    className="flex items-center gap-4 rounded-2xl glass p-4 shadow-soft transition hover:shadow-glass"
                  >
                    <div className="text-2xl">{scenario.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-3xl glass p-10 text-center shadow-soft">
            <Bot className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">No conversations yet — pick a scenario above to begin.</p>
          </div>
        )}
      </section>
    </div>
  );
}
