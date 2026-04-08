import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    url: typeof url === "string" ? url.trim().replace(/\/+$/, "") : "",
    key: typeof key === "string" ? key.trim() : "",
  };
}

const env = readEnv();

/**
 * Both must be set in vendor-frontend/.env.local (restart dev server after changes).
 * If URL is missing, supabase-js resolves REST calls against the current origin →
 * http://localhost:5174/rest/v1/... → 404 and no POs/data.
 */
export const isSupabaseConfigured = Boolean(
  env.url && env.key && /^https?:\/\//i.test(env.url)
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.error(
    "[vendor-frontend] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in vendor-frontend/.env.local, then restart the dev server."
  );
}

// Placeholder host avoids relative URLs hitting the Vite dev server (404). Calls will fail until env is fixed.
const resolvedUrl = isSupabaseConfigured
  ? env.url
  : "https://invalid-placeholder-not-configured.supabase.co";
const resolvedKey = isSupabaseConfigured ? env.key : "invalid-placeholder-key";

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  },
});
