import { createFileRoute } from "@tanstack/react-router";
import { BookText } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/grammar")({
  head: () => ({ meta: [{ title: "Grammar — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Grammar Teacher"
      title="Master English grammar"
      description="Interactive lessons, examples, and exercises for every grammar topic. Ask your AI tutor to explain any rule with clear examples."
      icon={BookText}
      items={[
        { title: "Tenses", desc: "Past, present, future — with time markers." },
        { title: "Articles", desc: "A, an, the — when and why." },
        { title: "Prepositions", desc: "In, on, at, by, of and more." },
        { title: "Active & Passive", desc: "Transform sentences with confidence." },
        { title: "Direct & Indirect", desc: "Report speech naturally." },
        { title: "Modal Verbs", desc: "Can, could, should, must, might." },
        { title: "Conjunctions", desc: "Link ideas smoothly." },
        { title: "Subject–Verb Agreement", desc: "Match tricky subjects to verbs." },
        { title: "Punctuation", desc: "Commas, semicolons, and clarity." },
        { title: "Sentence Structure", desc: "Simple, compound, complex." },
        { title: "Question Formation", desc: "Ask like a native." },
        { title: "Adjectives & Adverbs", desc: "Describe with precision." },
      ]}
      cta="Start a grammar lesson"
    />
  ),
});
