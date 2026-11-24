import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/** Supabase client for Client Components (runs in the browser, anon key + RLS). */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
