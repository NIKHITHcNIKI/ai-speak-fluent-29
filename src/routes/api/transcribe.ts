import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.startsWith("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const inbound = await request.formData();
        const file = inbound.get("file");
        if (!(file instanceof File) || file.size < 1024) {
          return new Response("Empty or missing audio file", { status: 400 });
        }
        // Cap upload size to 25 MiB (gateway limit)
        if (file.size > 25 * 1024 * 1024) {
          return new Response("Audio too large", { status: 413 });
        }

        const language = (inbound.get("language") as string | null) ?? "en";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, file.name || "recording.wav");
        upstream.append("language", language);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return new Response(text || `Transcription failed: ${res.status}`, {
            status: res.status,
          });
        }

        const data = (await res.json()) as { text?: string };
        return new Response(JSON.stringify({ text: data.text ?? "" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
