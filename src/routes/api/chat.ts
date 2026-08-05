import { createFileRoute } from "@tanstack/react-router";
import { getScenario, SCENARIOS } from "@/lib/scenarios";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer } = await import("@/lib/verify-auth.server");
        const userId = await verifyBearer(request);
        if (!userId) {
          return new Response("Unauthorized", { status: 401 });
        }


        const body = (await request.json()) as {
          scenario?: string;
          messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
        };
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const scenario = SCENARIOS.find((s) => s.id === body.scenario) ?? getScenario("free_chat");
        const userTurns = body.messages.filter((m) => m.role === "user").length;

        const memoryGuard = `\n\nCONVERSATION MEMORY (CRITICAL):
- The full conversation so far is provided above. Re-read it before EVERY reply.
- The user has already sent ${userTurns} message(s). Remember their name, preferences, level, topics, and anything they told you earlier, and reference it naturally when relevant.
- NEVER repeat a question, prompt, greeting, or teaching point you have already used in this conversation. If you already asked something, move forward instead of re-asking.
- If the user asks for a new topic, a different question, or says "next" / "something else", switch to a genuinely new topic — do not rephrase the previous one.
- Do NOT re-introduce yourself after the first turn.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            stream: true,
            temperature: 0.8,
            messages: [
              { role: "system", content: scenario.systemPrompt + memoryGuard },
              ...body.messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "AI gateway error", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
