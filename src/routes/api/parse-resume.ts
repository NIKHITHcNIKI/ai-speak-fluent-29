import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/parse-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer } = await import("@/lib/verify-auth.server");
        if (!(await verifyBearer(request))) return new Response("Unauthorized", { status: 401 });


        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.startsWith("multipart/form-data"))
          return new Response("Expected multipart/form-data", { status: 400 });

        const fd = await request.formData();
        const file = fd.get("file");
        if (!(file instanceof File) || file.size < 100)
          return new Response("Empty or missing file", { status: 400 });
        if (file.size > 10 * 1024 * 1024) return new Response("File too large (max 10MB)", { status: 413 });

        const mime = file.type || "application/pdf";

        // Plain text / markdown — return as-is
        if (mime.startsWith("text/") || file.name.match(/\.(txt|md)$/i)) {
          const text = await file.text();
          return Response.json({ text: text.slice(0, 20000) });
        }

        // PDF or other doc — extract via multimodal AI
        const buf = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        const b64 = btoa(binary);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract ALL text content from this resume/CV. Preserve section headings (Summary, Skills, Experience, Education, Projects, Certifications). Return plain text only — no commentary.",
                  },
                  {
                    type: "file",
                    file: {
                      filename: file.name || "resume.pdf",
                      file_data: `data:${mime};base64,${b64}`,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(t || "Resume parse failed", { status: res.status });
        }
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = data.choices?.[0]?.message?.content ?? "";
        if (!text.trim()) return new Response("Could not extract resume text", { status: 422 });
        return Response.json({ text: text.slice(0, 20000) });
      },
    },
  },
});
