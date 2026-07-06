import { Link, useMatchRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  BookText,
  BookOpen,
  Mic,
  PencilLine,
  Headphones,
  Trophy,
  User,
  Menu,
  X,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type NavItem = {
  to: "/dashboard" | "/tutor" | "/scenarios" | "/grammar" | "/vocabulary" | "/pronunciation" | "/writing" | "/listening" | "/quizzes" | "/admin";
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tutor", label: "AI Tutor", icon: Bot, badge: "Live" },
  { to: "/scenarios", label: "Scenarios", icon: MessageSquare },
  { to: "/grammar", label: "Grammar", icon: BookText },
  { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { to: "/pronunciation", label: "Pronunciation", icon: Mic },
  { to: "/writing", label: "Writing", icon: PencilLine },
  { to: "/listening", label: "Listening", icon: Headphones },
  { to: "/quizzes", label: "Quizzes", icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,xp,streak_days,english_level")
        .eq("id", user.user.id)
        .maybeSingle();
      return { ...data, email: user.user.email };
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="px-2 py-3">
        <Logo />
      </div>

      {profile && (
        <div className="mt-3 rounded-2xl bg-gradient-primary p-4 text-white shadow-glow">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 font-semibold uppercase">
              {(profile.display_name?.[0] ?? profile.email?.[0] ?? "F")}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{profile.display_name ?? "Learner"}</div>
              <div className="text-[11px] uppercase tracking-wide text-white/70">{profile.english_level}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-2 py-1.5">
              <div className="text-[10px] uppercase text-white/70">XP</div>
              <div className="font-semibold">{profile.xp ?? 0}</div>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-1.5">
              <div className="text-[10px] uppercase text-white/70">Streak</div>
              <div className="font-semibold">🔥 {profile.streak_days ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const active = matchRoute({ to: item.to, fuzzy: item.to !== "/dashboard" });
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 space-y-1 border-t border-sidebar-border pt-3">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10"
          >
            <ShieldCheck className="h-[18px] w-[18px]" /> Admin
          </Link>
        )}
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent/60"
        >
          <User className="h-[18px] w-[18px]" /> Profile
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent/60"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Lovable AI
        </div>
      </div>
    </div>
  );
}
