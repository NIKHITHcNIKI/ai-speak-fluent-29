import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Quizzes & Challenges"
      title="Test yourself and earn XP"
      description="Ask the AI tutor to generate a quiz on any topic — grammar, vocabulary, listening, or reading. Earn XP and climb the leaderboard."
      icon={Trophy}
      items={[
        { title: "MCQ", desc: "Multiple choice, instant scoring." },
        { title: "Fill in the Blanks", desc: "Grammar and vocabulary." },
        { title: "Match the Words", desc: "Synonyms, antonyms, collocations." },
        { title: "Grammar Quiz", desc: "Focused topic drills." },
        { title: "Listening Quiz", desc: "Answer after audio clips." },
        { title: "Speaking Quiz", desc: "Speak and get scored." },
      ]}
      cta="Ask AI for a quiz"
    />
  ),
});
