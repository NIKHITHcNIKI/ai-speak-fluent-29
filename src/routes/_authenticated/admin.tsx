import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { listUsers, createUser, deleteUser, getMyRole } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — Fluenta" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const remove = useServerFn(deleteUser);
  const role = useServerFn(getMyRole);

  const { data: myRoles } = useQuery({ queryKey: ["my-role"], queryFn: () => role() });
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);

  const createMut = useMutation({
    mutationFn: () => create({ data: { email, password, displayName, makeAdmin } }),
    onSuccess: () => {
      toast.success(`User ${email} created`);
      setEmail(""); setPassword(""); setDisplayName(""); setMakeAdmin(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            {myRoles?.roles?.includes("admin") ? "You are signed in as an administrator." : ""} Create and manage learner accounts.
          </p>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-glass">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <UserPlus className="h-5 w-5 text-primary" /> Add new user
        </h2>
        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
          className="grid gap-3 md:grid-cols-4"
        >
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full name"
            className="rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            required type="text" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            className="rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit" disabled={createMut.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create user
          </button>
          <label className="md:col-span-4 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} />
            Grant admin privileges
          </label>
        </form>
      </div>

      <div className="mt-8 glass rounded-3xl p-6 shadow-glass">
        <h2 className="mb-4 font-display text-lg font-semibold">All users ({users?.length ?? 0})</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-3 py-2">XP</th>
                  <th className="px-3 py-2">Last active</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-medium">{u.email}</td>
                    <td className="px-3 py-3">{u.display_name ?? "—"}</td>
                    <td className="px-3 py-3">
                      {u.roles.map((r) => (
                        <span key={r} className={`mr-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${r === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {r}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-3">{u.xp}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteMut.mutate(u.id); }}
                        disabled={deleteMut.isPending}
                        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
