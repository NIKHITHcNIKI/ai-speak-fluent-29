import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/vocabulary")({
  head: () => ({ meta: [{ title: "Vocabulary — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Vocabulary Builder"
      title="Grow your English vocabulary daily"
      description="Learn new words in context with examples, synonyms, and quizzes. Ask your AI tutor for the word of the day or flashcards on any topic."
      icon={BookOpen}
      items={[
        { title: "Word of the Day", desc: "A fresh word every morning." },
        { title: "Synonyms & Antonyms", desc: "Expand your range." },
        { title: "Idioms", desc: "Sound natural with common expressions." },
        { title: "Phrasal Verbs", desc: "Get in, look after, put off, and more." },
        { title: "Collocations", desc: "Words that go together." },
        { title: "Flashcards", desc: "Spaced repetition, on your schedule." },
        { title: "Spelling Practice", desc: "Type as you hear." },
        { title: "Topic Packs", desc: "Travel, food, tech, business…" },
      ]}
      cta="Ask AI for today's word"
    />
  ),
});
