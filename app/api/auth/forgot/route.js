import { supabaseServer } from '@/lib/supabase/server';
import { json, logEvent } from '@/lib/authServer';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'សូមបញ្ចូល Email' }, 400);

  const origin = req.headers.get('origin') || new URL(req.url).origin;
  const sb = supabaseServer();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  await logEvent(req, { email, event: 'password_reset_requested' });
  if (error && /rate limit/i.test(error.message)) return json({ error: 'ស្នើច្រើនដងពេក — សូមរង់ចាំបន្តិចសិន' }, 429);
  // ឆ្លើយដូចគ្នាជានិច្ច ដើម្បីកុំឱ្យគេដឹងថា Email មានក្នុងប្រព័ន្ធឬអត់
  return json({ ok: true });
}
