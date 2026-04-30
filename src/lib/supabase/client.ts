"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function isSupabaseConfigured() {
  return getSupabaseBrowserEnv().configured;
}

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    return null;
  }

  const env = getSupabaseBrowserEnv();

  if (!env.configured) {
    return null;
  }

  if (supabaseBrowserClient !== undefined) {
    return supabaseBrowserClient;
  }

  const url = env.url;
  const anonKey = env.anonKey;

  if (!url || !anonKey) {
    return null;
  }

  supabaseBrowserClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseBrowserClient;
}
