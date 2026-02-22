/**
 * Loads Supabase client when config is available and wires auth UI.
 * Runs after renderer.js (which defines window.__setupSupabaseAuth).
 */
(async function () {
  if (!window.api || typeof window.api.getSupabaseConfig !== "function") return;
  const config = await window.api.getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) return;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(config.url, config.anonKey);
  if (typeof window.__setupSupabaseAuth === "function") {
    window.__setupSupabaseAuth(supabase);
  }
})();
