// src/lib/supabase-server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase para uso no servidor (Server Actions/Route Handlers).
 * Importante: função é async para permitir await cookies().
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  // Em Server Actions no Next 15, cookies() é async.
  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[2]) {
        try {
          cookieStore.set(name, value, options);
        } catch { /* noop */ }
      },
      remove(name: string, options?: Parameters<typeof cookieStore.set>[2]) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch { /* noop */ }
      },
    },
  });
}
