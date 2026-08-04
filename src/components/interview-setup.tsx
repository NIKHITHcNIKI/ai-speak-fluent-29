import { useMemo, useState } from "react";
import { FileText, Upload, Loader2, Search, Target, ArrowRight, Sparkles } from "lucide-react";
import {
  INTERVIEW_CATEGORIES,
  CUSTOM_TOPIC_EXAMPLES,
  searchTopics,
} from "@/lib/interview-topics";

/** Start screen: resume-based interview or domain / custom-topic interview. */
export function InterviewSetup({
  uploading,
  onUploadResume,
  onStartTopic,
}: {
  uploading: boolean;
  onUploadResume: (file: File) => void;
  onStartTopic: (topic: string) => void;
}) {
  const [mode, setMode] = useState<"resume" | "topic">("resume");
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState<string>(INTERVIEW_CATEGORIES[0].id);
  const results = useMemo(() => searchTopics(query), [query]);
  const activeCat =
    INTERVIEW_CATEGORIES.find((c) => c.id === openCat) ?? INTERVIEW_CATEGORIES[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">AI Mock Interview</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Practise interviews for any field — IT, finance, commerce, MBA, marketing, banking,
          engineering, healthcare, law and more. Beginner to advanced, with voice or text.
        </p>
      </header>

      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-2 rounded-2xl glass p-1.5 shadow-soft">
        {(
          [
            ["resume", "📄 Resume-based"],
            ["topic", "🎯 Domain / topic"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
              mode === id ? "bg-gradient-primary text-white shadow-glow" : "hover:bg-accent"
            }`}
            aria-pressed={mode === id}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "resume" ? (
        <div className="mx-auto mt-6 max-w-xl rounded-3xl glass p-8 text-center shadow-soft animate-fade-up">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Resume-based interview</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your resume (PDF, DOC, DOCX or TXT). The AI extracts your name, education,
            skills, experience, projects and certifications, then interviews you from beginner to
            advanced level.
          </p>
          <label
            className={`mt-6 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 ${
              uploading ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Analyzing resume…" : "Upload resume"}
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadResume(f);
              }}
            />
          </label>
          <p className="mt-3 text-xs text-muted-foreground">Max 10 MB. Nothing is stored.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5 animate-fade-up">
          <div className="rounded-3xl glass p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) onStartTopic(query.trim());
                }}
                placeholder="Enter any technology, subject, job role, or interview topic…"
                className="min-h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query.trim() && (
                <button
                  onClick={() => onStartTopic(query.trim())}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
                >
                  Start <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {query.trim() ? (
              <div className="mt-4">
                {results.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {results.map((r) => (
                      <TopicChip key={r.topic} label={r.topic} onClick={() => onStartTopic(r.topic)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No preset match — press <b>Start</b> to interview on “{query.trim()}” as a custom
                    topic.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted-foreground">
                  ✍ Popular custom topics
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CUSTOM_TOPIC_EXAMPLES.map((t) => (
                    <TopicChip key={t} label={t} onClick={() => onStartTopic(t)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {INTERVIEW_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpenCat(c.id)}
                className={`min-h-10 rounded-full px-3.5 text-xs font-semibold transition ${
                  openCat === c.id
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "glass hover:bg-accent"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-5 rounded-3xl glass p-4 shadow-soft sm:p-6">
            {activeCat.groups.map((g) => (
              <div key={g.name}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" /> {g.name}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.topics.map((t) => (
                    <TopicChip key={`${g.name}-${t}`} label={t} onClick={() => onStartTopic(t)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-h-10 rounded-xl bg-muted/70 px-3 text-xs font-medium transition hover:bg-accent hover:-translate-y-0.5"
    >
      {label}
    </button>
  );
}
