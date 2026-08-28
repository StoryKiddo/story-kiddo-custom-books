/**
 * Server-only Supabase client using the service role key.
 *
 * This key can read and write every table and storage bucket, ignoring RLS.
 * Never import this file from a Client Component, and never expose the key
 * with a NEXT_PUBLIC_ prefix.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export function createAdminSupabaseClient(): SupabaseClient<Database> | null {
  const env = getPublicSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();
  if (!env || !serviceRoleKey) return null;

  return createClient<Database>(env.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
