import { createFileRoute } from "@tanstack/react-router";
import { PencilLine } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/writing")({
  head: () => ({ meta: [{ title: "Writing — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Writing Assistant"
      title="Write with clarity and style"
      description="Paste any writing into the AI tutor for grammar checks, sentence-level rewrites, and tone suggestions."
      icon={PencilLine}
      items={[
        { title: "Essays", desc: "Structure, argument, and flow." },
        { title: "Emails", desc: "Professional and polite." },
        { title: "Letters", desc: "Formal and personal." },
        { title: "Paragraphs", desc: "Topic sentences and cohesion." },
        { title: "Stories", desc: "Show, don't tell." },
        { title: "Rewrite Assist", desc: "Simpler or more advanced." },
      ]}
      cta="Send your draft to AI"
    />
  ),
});
