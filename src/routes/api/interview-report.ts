import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/interview-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as {
          resume?: string;
          messages?: Array<{ role: "user" | "assistant"; content: string }>;
        };
        if (!Array.isArray(body.messages) || body.messages.length === 0)
          return new Response("messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const systemPrompt = `You are an expert interview evaluator. Using the resume and the full interview transcript, produce a detailed performance report in clean markdown with EXACTLY these sections:

## Overall Score
A single score out of 100 with one sentence of justification.

## Scores
A markdown table with rows: Communication, Grammar, Fluency, Pronunciation, Technical Knowledge, Confidence — each scored /100.

## Strengths
3-5 bullets.

## Weaknesses
3-5 bullets.

## Filler Words
The filler words/phrases the candidate repeated most (with rough counts), or "none noticeable".

## Grammar Corrections
Up to 6 "you said → better" pairs taken from real quotes in the transcript.

## Vocabulary Suggestions
5-8 stronger words/phrases they could have used.

## Interview Summary
Short paragraph.

## Recommended Learning Plan
A 7-day plan as bullets.

## Practice Questions
5 questions they should rehearse next.

Be specific and evidence-based; quote the candidate where useful. If pronunciation cannot be judged from text, score it based on transcription clarity and say so.

RESUME:
"""
${(body.resume ?? "").slice(0, 8000)}
"""`;

        const transcript = body.messages
          .map((m) => `${m.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${m.content}`)
          .join("\n\n")
          .slice(0, 30000);

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            stream: true,
            temperature: 0.4,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `INTERVIEW TRANSCRIPT:\n\n${transcript}` },
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
