import { supabaseServer } from '@/lib/supabase/server';
import { json, logEvent } from '@/lib/authServer';

// scope: 'local' = ឧបករណ៍នេះ, 'global' = គ្រប់ឧបករណ៍, 'others' = ឧបករណ៍ផ្សេងៗ
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const scope = ['global', 'others'].includes(body.scope) ? body.scope : 'local';
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (user) await logEvent(req, { user_id: user.id, email: user.email, event: scope === 'local' ? 'sign_out' : 'sign_out_all' });
  const { error } = await sb.auth.signOut({ scope });
  if (error && scope !== 'local') return json({ error: error.message }, 400);
  return json({ ok: true });
}
