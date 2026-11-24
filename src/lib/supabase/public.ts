import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for public catalog reads. Safe to call inside
 * `"use cache"` scopes, unlike the cookie-based server client.
 * Returns null when Supabase is not configured.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
