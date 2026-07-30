import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (client) return client;
  // Use placeholder values when env vars are missing so the client can be
  // created without crashing the app. Actual API calls will fail gracefully
  // until real credentials are configured.
  const url = supabaseUrl || "https://placeholder.supabase.co";
  const key = supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
  client = createClient(url, key, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : noopStorage,
      autoRefreshToken: typeof window !== "undefined",
      persistSession: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
    },
  });
  return client;
}
