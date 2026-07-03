import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ArrowRight } from "lucide-react";

interface Item {
  title: string;
  desc: string;
}

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  icon: Icon,
  items,
  cta = "Practice with AI Tutor",
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: Item[];
  cta?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-10 p-4 sm:p-8 animate-fade-up">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-primary text-white shadow-glow">
          <Icon className="h-8 w-8" />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={it.title}
            className="rounded-2xl glass p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="font-semibold">{it.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-glow">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">Learn faster with your AI tutor</h2>
            <p className="mt-1 max-w-md text-sm text-white/85">
              Ask your tutor to run a lesson, give examples, or quiz you on any topic in this module.
            </p>
          </div>
          <Link
            to="/tutor"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft transition hover:brightness-95"
          >
            {cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
