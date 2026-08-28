/**
 * Browser / public Supabase client.
 *
 * Uses the anonymous key, so it is limited by Row Level Security. Right now
 * that means it can read the `tracks` catalog and not much else. Order writes
 * go through the service-role client in `admin.ts`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export function createPublicSupabaseClient(): SupabaseClient<Database> | null {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
