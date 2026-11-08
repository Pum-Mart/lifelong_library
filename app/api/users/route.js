import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { passwordProblem } from '@/lib/authServer';

// បង្កើតគណនីចូលប្រព័ន្ធ សម្រាប់បុគ្គលិក (តែអ្នកគ្រប់គ្រង) ឬសមាជិក (បុគ្គលិកណាក៏បាន)
export async function POST(req) {
  const body = await req.json();
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'សូមចូលប្រព័ន្ធ' }, { status: 401 });
  const { data: me } = await sb.from('staff').select('role, active').eq('auth_user_id', user.id).maybeSingle();
  if (!me?.active) return NextResponse.json({ error: 'គ្មានសិទ្ធិ' }, { status: 403 });
  if (body.kind === 'staff' && me.role !== 'admin') return NextResponse.json({ error: 'មានតែអ្នកគ្រប់គ្រងទេ' }, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'មិនទាន់កំណត់ SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Email មិនត្រឹមត្រូវ' }, { status: 400 });
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const uid = created.user.id;

  let linkErr;
  if (body.kind === 'staff') {
    ({ error: linkErr } = await admin.from('staff').insert({ auth_user_id: uid, name: body.name || email, role: body.role === 'admin' ? 'admin' : 'librarian' }));
  } else {
    ({ error: linkErr } = await admin.from('members').update({ auth_user_id: uid }).eq('id', body.member_id));
  }
  if (linkErr) {
    await admin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: linkErr.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// លុបបុគ្គលិក (តែអ្នកគ្រប់គ្រង)
export async function DELETE(req) {
  const { staff_id } = await req.json();
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: me } = user ? await sb.from('staff').select('id, role, active').eq('auth_user_id', user.id).maybeSingle() : { data: null };
  if (!me?.active || me.role !== 'admin') return NextResponse.json({ error: 'មានតែអ្នកគ្រប់គ្រងទេ' }, { status: 403 });
  if (me.id === staff_id) return NextResponse.json({ error: 'មិនអាចលុបខ្លួនឯងបានទេ' }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: s } = await admin.from('staff').select('auth_user_id').eq('id', staff_id).single();
  if (!s) return NextResponse.json({ error: 'រកមិនឃើញ' }, { status: 404 });
  const { error } = await admin.auth.admin.deleteUser(s.auth_user_id);
  if (error) return NextResponse.json({ error: 'មិនអាចលុបបានទេ (មានប្រវត្តិការងារ) — សូមបិទគណនីជំនួសវិញ' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
