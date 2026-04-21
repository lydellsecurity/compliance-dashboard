import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Running in local-only mode.');
}

// Fail fast when the Supabase host is unreachable (paused project, DNS failure, offline).
// Without this, the browser waits ~30s per request and GoTrue's refresh-token retry
// loop can block app startup for minutes.
const FETCH_TIMEOUT_MS = 3000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer));
};

// Clerk owns the session. Supabase just validates incoming JWTs — it doesn't
// mint them. This getter is installed by ClerkSupabaseBridge at app boot and
// is read by supabase-js on every request.
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export function setSupabaseTokenGetter(
  getter: (() => Promise<string | null>) | null
) {
  clerkTokenGetter = getter;
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithTimeout },
      accessToken: async () => (clerkTokenGetter ? clerkTokenGetter() : null),
      auth: {
        // Clerk handles all session state — disable supabase-js's GoTrue loop
        // so it stops fighting over storage and refresh timers.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;
