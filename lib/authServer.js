import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';

export const MIN_PASSWORD = 8;
export const MAX_FAILED = 5;          // ចូលខុស ៥ ដង…
export const LOCK_MINUTES = 15;       // …ចាក់សោ ១៥ នាទី

export const json = (body, status = 200) => NextResponse.json(body, { status });
export const hasServiceKey = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// អនុញ្ញាតតែផ្លូវក្នុងគេហទំព័រ (ការពារ open redirect)
export function safeNext(next, fallback = '/') {
  const n = String(next || '');
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : fallback;
}

export function clientInfo(req) {
  const fwd = req.headers.get('x-forwarded-for');
  return {
    ip: (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || '').trim() || null,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300) || null,
  };
}

// កត់ត្រាព្រឹត្តិការណ៍ — មិនបញ្ឈប់សកម្មភាពមេ ប្រសិនបើកត់ត្រាបរាជ័យ
export async function logEvent(req, { user_id = null, email = null, event, actor_id = null }) {
  if (!hasServiceKey()) return;
  try {
    await supabaseAdmin().from('auth_events').insert({
      user_id, email: email ? String(email).toLowerCase() : null, event, actor_id, ...clientInfo(req),
    });
  } catch {}
}

export async function isLocked(email) {
  if (!hasServiceKey()) return false;
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  const admin = supabaseAdmin();
  // រាប់តែការបរាជ័យក្រោយការចូលជោគជ័យចុងក្រោយ
  const { data: ok } = await admin.from('auth_events').select('created_at')
    .eq('email', email).eq('event', 'sign_in').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(1);
  const from = ok?.[0]?.created_at || since;
  const { count } = await admin.from('auth_events').select('id', { count: 'exact', head: true })
    .eq('email', email).eq('event', 'sign_in_failed').gt('created_at', from);
  return (count || 0) >= MAX_FAILED;
}

export function passwordProblem(pw) {
  const p = String(pw || '');
  if (p.length < MIN_PASSWORD) return `ពាក្យសម្ងាត់ត្រូវមាន ${MIN_PASSWORD} តួយ៉ាងតិច`;
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'ពាក្យសម្ងាត់ត្រូវមានទាំងអក្សរ និងលេខ';
  return null;
}

// អ្នកប្រើបច្ចុប្បន្ន + ជួរ staff របស់គេ
export async function currentUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, staff: null };
  const { data: staff } = await sb.from('staff').select('id, role, active').eq('auth_user_id', user.id).maybeSingle();
  return { sb, user, staff };
}

// ត្រឡប់ error response ប្រសិនបើមិនមែនជាអ្នកគ្រប់គ្រងសកម្ម
export async function requireAdmin() {
  const ctx = await currentUser();
  if (!ctx.user) return { error: json({ error: 'សូមចូលប្រព័ន្ធ' }, 401) };
  if (!ctx.staff?.active || ctx.staff.role !== 'admin') return { error: json({ error: 'មានតែអ្នកគ្រប់គ្រងទេ' }, 403) };
  if (!hasServiceKey()) return { error: json({ error: 'មិនទាន់កំណត់ SUPABASE_SERVICE_ROLE_KEY' }, 500) };
  return ctx;
}
