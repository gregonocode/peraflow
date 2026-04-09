// utils/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use a service role key para server-side

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL ou Service Role Key não configurados nas variáveis de ambiente');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}