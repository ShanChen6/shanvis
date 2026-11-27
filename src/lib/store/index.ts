import "server-only";

import { createClient } from "@supabase/supabase-js";

import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export * from "./types";

const globalForStore = globalThis as unknown as { __shanvisStore?: Store };

/**
 * Supabase-backed store when NEXT_PUBLIC_SUPABASE_URL is set (requires
 * SUPABASE_SERVICE_ROLE_KEY); otherwise an in-memory demo store, kept on
 * globalThis so it survives dev hot reloads.
 */
export function getStore(): Store {
  if (globalForStore.__shanvisStore) return globalForStore.__shanvisStore;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let store: Store;
  if (!url) {
    store = new MemoryStore();
  } else if (!serviceRoleKey) {
    // The catalog would come from Supabase while orders went to memory: refuse.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when NEXT_PUBLIC_SUPABASE_URL is set.");
  } else {
    store = new SupabaseStore(createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }));
  }

  globalForStore.__shanvisStore = store;
  return store;
}

export function isDemoStore() {
  return getStore().mode === "memory";
}
