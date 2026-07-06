import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "nikhithc@fluenta.app";
const ADMIN_PASSWORD = "Nikhithc@2003";
const ADMIN_DISPLAY_NAME = "Nikhithc";

// One-shot idempotent admin seed. Safe because credentials are pre-decided
// and the endpoint only creates the fixed admin account if it does not exist.
export const Route = createFileRoute("/api/public/init-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        if (listErr) return Response.json({ ok: false, error: listErr.message }, { status: 500 });

        let user = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

        if (!user) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: ADMIN_DISPLAY_NAME },
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          user = created.user ?? undefined;
        }

        if (user) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        }

        return Response.json({ ok: true, email: ADMIN_EMAIL });
      },
    },
  },
});
