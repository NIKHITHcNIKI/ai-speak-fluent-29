import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { SCENARIOS, type ScenarioCategory } from "@/lib/scenarios";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({
    meta: [{ title: "Conversation Scenarios — Fluenta" }, { name: "robots", content: "noindex" }],
  }),
  component: Scenarios,
});

const GROUPS: { label: string; key: ScenarioCategory; description: string }[] = [
  { key: "conversation", label: "Everyday Life", description: "Real conversations you'll have every day." },
  { key: "interview", label: "Interview Practice", description: "HR, technical, mock interviews with feedback." },
  { key: "professional", label: "Professional English", description: "Office, meetings, IELTS, business coaching." },
];

function Scenarios() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const start = async (id: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const scenario = SCENARIOS.find((s) => s.id === id)!;
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 sm:p-8 animate-fade-up">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
          Conversation Modes
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Pick a scenario to practice</h1>
        <p className="mt-2 text-muted-foreground">
          The AI adopts a role, keeps the conversation natural, and gives feedback at the end.
        </p>
      </header>

      {GROUPS.map((group) => (
        <section key={group.key}>
          <h2 className="font-display text-xl font-bold">{group.label}</h2>
          <p className="text-sm text-muted-foreground">{group.description}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.filter((s) => s.category === group.key).map((s) => (
              <button
                key={s.id}
                onClick={() => start(s.id)}
                className="group relative overflow-hidden rounded-2xl glass p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
              >
                <div className="text-3xl">{s.emoji}</div>
                <div className="mt-3 font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
