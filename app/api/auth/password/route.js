import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { json, logEvent, passwordProblem } from '@/lib/authServer';

// ប្ដូរពាក្យសម្ងាត់ (ត្រូវការពាក្យចាស់ លើកលែងតែមកពីតំណ Email)
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'តំណផុតកំណត់ ឬមិនទាន់ចូលប្រព័ន្ធ' }, 401);

  const problem = passwordProblem(body.password);
  if (problem) return json({ error: problem }, 400);

  const jar = cookies();
  const recovery = jar.get('pw_recovery')?.value === '1';
  if (!recovery) {
    // ផ្ទៀងផ្ទាត់ពាក្យចាស់ដោយ client ដាច់ដោយឡែក (មិនប៉ះពាល់ cookie)
    const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error } = await probe.auth.signInWithPassword({ email: user.email, password: String(body.current || '') });
    if (error) return json({ error: 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ' }, 400);
    await probe.auth.signOut();
    if (body.current === body.password) return json({ error: 'ពាក្យសម្ងាត់ថ្មីត្រូវខុសពីពាក្យចាស់' }, 400);
  }

  const { error } = await sb.auth.updateUser({ password: body.password });
  if (error) return json({ error: /same/i.test(error.message) ? 'ពាក្យសម្ងាត់ថ្មីត្រូវខុសពីពាក្យចាស់' : error.message }, 400);

  // បណ្ដេញ session នៅឧបករណ៍ផ្សេងៗ
  await sb.auth.signOut({ scope: 'others' });
  if (recovery) jar.delete('pw_recovery');
  await logEvent(req, { user_id: user.id, email: user.email, event: recovery ? 'password_reset' : 'password_changed' });
  return json({ ok: true });
}
