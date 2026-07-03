import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/listening")({
  head: () => ({ meta: [{ title: "Listening — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Listening Practice"
      title="Train your ear for real English"
      description="Native audio at slow, normal, and fast speeds. Ask the AI tutor to read any passage aloud or dictate a short story."
      icon={Headphones}
      items={[
        { title: "Podcasts", desc: "Short episodes for every level." },
        { title: "Dialogues", desc: "Real conversations with transcripts." },
        { title: "News", desc: "Today's headlines, simplified." },
        { title: "Slow / Normal", desc: "Choose the speed you need." },
        { title: "Repeat Audio", desc: "Loop tricky sections." },
        { title: "Comprehension Quiz", desc: "Test what you heard." },
      ]}
      cta="Have AI read a story"
    />
  ),
});
