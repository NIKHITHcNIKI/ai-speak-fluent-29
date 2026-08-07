// Secondary, READ-ONLY Supabase client for an external project.
//
// This is NOT the app's backend. Auth, profiles, threads, messages and roles all
// stay on the primary client (@/integrations/supabase/client). Use this only to
// read data that lives in the external project, and only through tables whose
// RLS policies allow anonymous (`anon`) SELECT there.
//
// The key below is a *publishable* key, so it is safe in client code. The secret
// key is intentionally NOT used here — no privileged access from the browser.
import { createClient } from "@supabase/supabase-js";

export const EXTERNAL_SUPABASE_URL = "https://mjjyspbbgdkkvydvtmjr.supabase.co";
export const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cfOwoteb7zafjIku03GYrQ_jYOPMHv4";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New-format sb_ keys are opaque strings, not JWTs. PostgREST rejects them when
// they arrive as `Authorization: Bearer <key>` ("Expected 3 parts in JWT; got 1"),
// so send them only via the `apikey` header.
function createExternalFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createExternalSupabaseClient() {
  return createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createExternalFetch(EXTERNAL_SUPABASE_PUBLISHABLE_KEY) },
    // No session handling: this client never signs anyone in and must not touch
    // the primary client's localStorage session.
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _externalSupabase: ReturnType<typeof createExternalSupabaseClient> | undefined;

/**
 * Read-only client for the external Supabase project.
 *
 * Usage:
 *   import { externalSupabase } from "@/integrations/external-supabase/client";
 *   const { data, error } = await externalSupabase.from("some_table").select("id, name");
 *
 * Works in components, hooks, and inside server functions / server route handlers.
 * Untyped on purpose — the external project's generated types are not available
 * here. Cast results at the call site if you need type safety.
 */
export const externalSupabase = new Proxy(
  {} as ReturnType<typeof createExternalSupabaseClient>,
  {
    get(_, prop, receiver) {
      if (!_externalSupabase) _externalSupabase = createExternalSupabaseClient();
      return Reflect.get(_externalSupabase, prop, receiver);
    },
  },
);
