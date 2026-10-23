import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl && rawKey && /^https?:\/\//i.test(rawUrl)
);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ [P2P Frontend] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
    "If deployed on Render, add them under 'Environment' and trigger 'Clear build cache & deploy'."
  );
}

// Fallback dummy values prevent top-level module crash when env vars were missing at build time.
// Note: No real credentials/secrets are placed in source code.
const supabaseUrl = isSupabaseConfigured
  ? rawUrl.trim().replace(/\/+$/, "")
  : "https://placeholder-not-configured.supabase.co";
const supabaseAnonKey = isSupabaseConfigured ? rawKey.trim() : "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  },
});
