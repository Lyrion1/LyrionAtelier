// Service-role database client. Tables are defined in supabase/migrations and
// have row-level security on with no public policies, so only these functions
// can read or write them.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';
import { requireEnv } from './env.ts';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return client;
}
