import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display font-bold ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
        <Sparkles className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-xl tracking-tight">
        Fluenta<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
