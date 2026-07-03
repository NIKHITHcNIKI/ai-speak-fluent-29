import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Mic,
  Bot,
  BookOpen,
  Trophy,
  Target,
  MessageSquare,
  Volume2,
  Pencil,
  Headphones,
  BrainCircuit,
  Users,
  Rocket,
  Check,
} from "lucide-react";
import heroImage from "@/assets/hero-ai-tutor.jpg";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Bot, title: "AI English Tutor", desc: "Chat 24/7 with a patient tutor that adapts to your level." },
  { icon: Pencil, title: "Grammar Correction", desc: "Instant fixes with clear, simple explanations." },
  { icon: Mic, title: "Speaking Practice", desc: "Talk out loud in real-life scenarios." },
  { icon: BookOpen, title: "Vocabulary Builder", desc: "Word of the day, flashcards, and quizzes." },
  { icon: Volume2, title: "Pronunciation", desc: "Sound like a native with phonetic breakdowns." },
  { icon: Target, title: "Daily Lessons", desc: "Bite-sized lessons designed around your goals." },
  { icon: Users, title: "Mock Interviews", desc: "HR, technical, and behavioral practice with a report card." },
  { icon: MessageSquare, title: "Writing Assistant", desc: "Polish emails, essays, and stories." },
  { icon: Headphones, title: "Listening Practice", desc: "Podcasts, dialogues, and comprehension quizzes." },
];

const paths = [
  {
    level: "Beginner",
    tint: "from-success/20 to-success/5",
    items: ["Alphabet", "Basic Vocabulary", "Simple Sentences", "Greetings"],
    icon: BookOpen,
  },
  {
    level: "Intermediate",
    tint: "from-primary/20 to-primary/5",
    items: ["Grammar", "Daily Conversations", "Story Reading", "Writing"],
    icon: BrainCircuit,
  },
  {
    level: "Advanced",
    tint: "from-secondary/20 to-secondary/5",
    items: ["Business English", "Public Speaking", "Interviews", "Debates", "Emails", "Presentations"],
    icon: Rocket,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#paths" className="transition hover:text-foreground">Learning Paths</a>
            <a href="#how" className="transition hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="relative z-10 flex flex-col justify-center animate-fade-up">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by advanced AI · English tutor
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Learn English fluently with your{" "}
              <span className="text-gradient">personal AI tutor</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Practice speaking, grammar, vocabulary, pronunciation, interview skills, and
              real-life conversations anytime — with an AI that remembers you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-glass"
              >
                <Mic className="h-4 w-4" /> Talk to AI
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> No credit card</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Beginner → Advanced</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Voice + Text</div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-primary opacity-30 blur-3xl" />
              <div className="relative animate-float rounded-[2.5rem] glass-strong p-3 shadow-glow">
                <img
                  src={heroImage}
                  alt="A student having a conversation with an AI English tutor"
                  width={1280}
                  height={1280}
                  className="h-auto w-full max-w-lg rounded-[2rem]"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden rounded-2xl glass px-4 py-3 shadow-glass sm:block">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-success/20 text-success">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Grammar score</div>
                    <div className="text-sm font-semibold">98 / 100</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 top-8 hidden rounded-2xl glass px-4 py-3 shadow-glass sm:block">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary/20 text-secondary">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Streak</div>
                    <div className="text-sm font-semibold">14 days 🔥</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Why Fluenta
          </div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything you need to speak with confidence</h2>
          <p className="mt-3 text-muted-foreground">
            One app for grammar, vocabulary, pronunciation, writing, and real conversations.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-3xl glass p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-glass animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PATHS */}
      <section id="paths" className="relative py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              Learning Paths
            </div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">A journey for every level</h2>
            <p className="mt-3 text-muted-foreground">Start where you are. Progress at your own pace.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {paths.map((p) => (
              <div
                key={p.level}
                className={`relative overflow-hidden rounded-3xl glass-strong p-8 shadow-glass transition hover:-translate-y-1`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${p.tint} opacity-70`} />
                <div className="relative">
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
                    <p.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-2xl font-bold">{p.level}</h3>
                  <ul className="mt-4 space-y-2">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            { n: "1", t: "Sign up in seconds", d: "Free forever plan. Google sign-in in one click." },
            { n: "2", t: "Chat with your AI tutor", d: "Voice or text — practice real scenarios that matter." },
            { n: "3", t: "Track your progress", d: "Streaks, XP, badges, and weekly reports keep you motivated." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl glass p-8 shadow-soft">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary font-display text-lg font-bold text-white shadow-glow">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-primary p-10 text-center text-primary-foreground shadow-glow sm:p-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-5xl">
            Ready to speak English confidently?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/85">
            Join thousands of learners practicing every day with Fluenta.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-primary shadow-soft transition hover:brightness-95"
          >
            Start free — no card required <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Fluenta. Learn English with AI.</p>
        </div>
      </footer>
    </div>
  );
}
