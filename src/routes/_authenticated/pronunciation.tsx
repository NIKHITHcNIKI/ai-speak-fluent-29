import { createFileRoute } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/pronunciation")({
  head: () => ({ meta: [{ title: "Pronunciation — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Pronunciation Practice"
      title="Sound clear and confident"
      description="Record your voice, get a pronunciation score, and hear native audio. In the AI tutor, use the mic to speak — words are transcribed and coached live."
      icon={Mic}
      items={[
        { title: "Record & Compare", desc: "See how close you are to native." }, 
        { title: "Word-Level Scoring", desc: "Instant feedback on each word." },
        { title: "Phonetic Breakdown", desc: "IPA symbols and mouth shapes." },
        { title: "Native Audio", desc: "Male and female speakers." },
        { title: "Minimal Pairs", desc: "Ship vs Sheep, Bat vs Bad." },
        { title: "Sentence Drill", desc: "Repeat and improve rhythm." },
      ]}
      cta="Practice with the AI tutor"
    />
  ),
});
