import { supabaseAdmin } from '@/lib/supabase/server';
import { json, logEvent, requireAdmin, passwordProblem } from '@/lib/authServer';

// បញ្ជីគណនីទាំងអស់ (បុគ្គលិក + សមាជិក) ជាមួយព័ត៌មានចូលប្រព័ន្ធ
export async function GET() {
  const ctx = await requireAdmin();
  if (ctx.error) return ctx.error;
  const admin = supabaseAdmin();

  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: error.message }, 400);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [{ data: staff }, { data: members }] = await Promise.all([
    admin.from('staff').select('id, auth_user_id, name, role, active'),
    admin.from('members').select('id, auth_user_id, name, member_code').not('auth_user_id', 'is', null),
  ]);
  const sMap = new Map((staff || []).map((s) => [s.auth_user_id, s]));
  const mMap = new Map((members || []).map((m) => [m.auth_user_id, m]));
  const now = Date.now();

  const rows = users.map((u) => {
    const s = sMap.get(u.id); const m = mMap.get(u.id);
    const banned = !!u.banned_until && new Date(u.banned_until).getTime() > now;
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      disabled: banned || (s ? !s.active : false),
      kind: s ? 'staff' : m ? 'member' : 'none',
      name: s?.name || m?.name || '',
      role: s?.role || null,
      staff_id: s?.id || null,
      member_id: m?.id || null,
      member_code: m?.member_code || null,
      self: u.id === ctx.user.id,
    };
  }).sort((a, b) => (b.last_sign_in_at || '').localeCompare(a.last_sign_in_at || ''));
  return json({ rows });
}

// សកម្មភាពលើគណនីមួយ
export async function POST(req) {
  const ctx = await requireAdmin();
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { action, user_id } = body;
  if (!user_id) return json({ error: 'ខ្វះ user_id' }, 400);
  const self = user_id === ctx.user.id;
  if (self && ['disable', 'delete', 'signout'].includes(action)) return json({ error: 'មិនអាចធ្វើលើគណនីខ្លួនឯងបានទេ — ប្រើទំព័រ «គណនីខ្ញុំ»' }, 400);

  const admin = supabaseAdmin();
  const { data: { user: target }, error: getErr } = await admin.auth.admin.getUserById(user_id);
  if (getErr || !target) return json({ error: 'រកគណនីមិនឃើញ' }, 404);
  const log = (event) => logEvent(req, { user_id, email: target.email, event, actor_id: ctx.user.id });
  const revoke = () => ctx.sb.rpc('admin_revoke_sessions', { p_user_id: user_id });

  switch (action) {
    case 'set_password': {
      const problem = passwordProblem(body.password);
      if (problem) return json({ error: problem }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: body.password });
      if (error) return json({ error: error.message }, 400);
      if (!self) await revoke();
      await log('admin_set_password');
      return json({ ok: true, message: `បានកំណត់ពាក្យសម្ងាត់ថ្មីសម្រាប់ ${target.email}` });
    }
    case 'disable': {
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' });
      if (error) return json({ error: error.message }, 400);
      await admin.from('staff').update({ active: false }).eq('auth_user_id', user_id);
      await revoke();
      await log('admin_disabled');
      return json({ ok: true, message: `បានបិទគណនី ${target.email}` });
    }
    case 'enable': {
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
      if (error) return json({ error: error.message }, 400);
      await admin.from('staff').update({ active: true }).eq('auth_user_id', user_id);
      await log('admin_enabled');
      return json({ ok: true, message: `បានបើកគណនី ${target.email}` });
    }
    case 'signout': {
      const { data, error } = await revoke();
      if (error) return json({ error: error.message }, 400);
      await log('admin_signed_out');
      return json({ ok: true, message: `បានបណ្ដេញចេញពី ${data ?? 0} ឧបករណ៍` });
    }
    case 'change_email': {
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Email មិនត្រឹមត្រូវ' }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { email, email_confirm: true });
      if (error) return json({ error: /already/i.test(error.message) ? 'Email នេះមានគេប្រើរួចហើយ' : error.message }, 400);
      await log('admin_changed_email');
      return json({ ok: true, message: `បានប្ដូរ Email ទៅ ${email}` });
    }
    case 'delete': {
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: 'មិនអាចលុបបានទេ (គណនីនេះមានប្រវត្តិការងារ) — សូម «បិទ» គណនីជំនួសវិញ' }, 400);
      await logEvent(req, { email: target.email, event: 'admin_deleted', actor_id: ctx.user.id });
      return json({ ok: true, message: `បានលុបគណនីចូលប្រព័ន្ធ ${target.email}` });
    }
    default:
      return json({ error: 'សកម្មភាពមិនស្គាល់' }, 400);
  }
}
