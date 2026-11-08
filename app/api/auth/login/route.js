import { supabaseServer } from '@/lib/supabase/server';
import { json, logEvent, isLocked, safeNext, LOCK_MINUTES } from '@/lib/authServer';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json({ error: 'សូមបញ្ចូល Email និងពាក្យសម្ងាត់' }, 400);

  if (await isLocked(email)) {
    await logEvent(req, { email, event: 'sign_in_locked' });
    return json({ error: `ចូលខុសច្រើនដងពេក — សូមរង់ចាំ ${LOCK_MINUTES} នាទី ឬកំណត់ពាក្យសម្ងាត់ថ្មី` }, 429);
  }

  const sb = supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    await logEvent(req, { email, event: 'sign_in_failed' });
    const banned = /banned/i.test(error.message);
    return json({ error: banned ? 'គណនីនេះត្រូវបានបិទ — សូមទាក់ទងអ្នកគ្រប់គ្រង' : 'Email ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' }, banned ? 403 : 401);
  }

  const uid = data.user.id;
  const [{ data: staff }, { data: member }] = await Promise.all([
    sb.from('staff').select('active').eq('auth_user_id', uid).maybeSingle(),
    sb.from('members').select('id').eq('auth_user_id', uid).maybeSingle(),
  ]);
  if (staff && !staff.active) {
    await sb.auth.signOut({ scope: 'local' });
    await logEvent(req, { user_id: uid, email, event: 'sign_in_failed' });
    return json({ error: 'គណនីនេះត្រូវបានបិទ — សូមទាក់ទងអ្នកគ្រប់គ្រង' }, 403);
  }

  await logEvent(req, { user_id: uid, email, event: 'sign_in' });
  const home = staff ? '/admin' : member ? '/me' : '/account';
  return json({ ok: true, redirect: safeNext(body.next, home) });
}
