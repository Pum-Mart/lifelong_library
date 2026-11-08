'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { postJSON, AUTH_EVENT, deviceName, fmtDateTime } from '@/lib/authClient';
import AdminOnly from '@/components/AdminOnly';
import { PageTitle, Card, Field, Input, PasswordInput, Select, Button, Alert, Table, td, Badge, StatusBadge, Spinner, Empty } from '@/components/ui';

const KIND = { staff: 'បុគ្គលិក', member: 'សមាជិក', none: 'មិនភ្ជាប់' };
const BLANK = { kind: 'staff', name: '', role: 'librarian', member_id: '', email: '', password: '' };

// បង្កើតគណនីថ្មី៖ បុគ្គលិក ឬសមាជិក (ភ្ជាប់ជាមួយសមាជិកដែលមានស្រាប់)
function NewAccount({ onDone, onCancel }) {
  const sb = supabaseBrowser();
  const [f, setF] = useState(BLANK);
  const [mq, setMq] = useState('');
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (f.kind !== 'member') return;
    let qy = sb.from('members').select('id, name, member_code, phone').is('auth_user_id', null).order('name').limit(30);
    const term = mq.replace(/[,()%*]/g, ' ').trim();
    if (term) qy = qy.or(`name.ilike.%${term}%,member_code.ilike.%${term}%,phone.ilike.%${term}%`);
    const t = setTimeout(() => qy.then(({ data }) => setMembers(data || [])), 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.kind, mq]);

  function genPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const a = crypto.getRandomValues(new Uint32Array(10));
    let p = Array.from(a.slice(0, 7), (n) => chars[n % chars.length]).join('');
    p += Array.from(a.slice(7), (n) => n % 10).join('');
    setF({ ...f, password: p });
  }

  async function submit(e) {
    e.preventDefault();
    if (f.kind === 'member' && !f.member_id) return setErr('សូមជ្រើសរើសសមាជិក');
    setBusy(true); setErr('');
    const body = f.kind === 'staff'
      ? { kind: 'staff', name: f.name, role: f.role, email: f.email, password: f.password }
      : { kind: 'member', member_id: Number(f.member_id), email: f.email, password: f.password };
    const r = await postJSON('/api/users', body);
    setBusy(false);
    if (!r.ok) return setErr(r.error || 'មានបញ្ហា');
    onDone(`បានបង្កើតគណនី ${f.email} — ពាក្យសម្ងាត់៖ ${f.password} (សូមប្រាប់អ្នកប្រើ ហើយឱ្យគេប្ដូរនៅទំព័រ «គណនី»)`);
  }

  return (
    <Card className="mb-4 border-brand-200">
      <h2 className="mb-3 font-semibold">បង្កើតគណនីថ្មី</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          {[['staff', 'បុគ្គលិក'], ['member', 'សមាជិក']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setF({ ...f, kind: k, member_id: '' })}
              className={`rounded-lg px-3 py-1.5 text-sm ${f.kind === k ? 'bg-brand-600 text-white' : 'border bg-white hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>

        {f.kind === 'staff' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="ឈ្មោះ"><Input required value={f.name} onChange={set('name')} /></Field>
            <Field label="តួនាទី">
              <Select value={f.role} onChange={set('role')}><option value="librarian">បណ្ណារក្ស</option><option value="admin">អ្នកគ្រប់គ្រង</option></Select>
            </Field>
          </div>
        ) : (
          <Field label="សមាជិក (ដែលមិនទាន់មានគណនី)" hint={<>មិនឃើញ? <Link href="/admin/members/new" className="text-brand-600">ចុះឈ្មោះសមាជិកថ្មី</Link> ជាមុនសិន</>}>
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="ស្វែងរកឈ្មោះ លេខសមាជិក ទូរស័ព្ទ…" value={mq} onChange={(e) => setMq(e.target.value)} />
              <Select required value={f.member_id} onChange={set('member_id')}>
                <option value="">— ជ្រើសរើស ({members.length}) —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.member_code} · {m.name}{m.phone ? ` · ${m.phone}` : ''}</option>)}
              </Select>
            </div>
          </Field>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Email (សម្រាប់ចូលប្រព័ន្ធ)"><Input type="email" required autoComplete="off" value={f.email} onChange={set('email')} /></Field>
          <Field label="ពាក្យសម្ងាត់ដំបូង" hint="៨ តួ មានទាំងអក្សរ និងលេខ">
            <div className="flex gap-2">
              <div className="flex-1"><PasswordInput required minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
              <Button type="button" variant="secondary" onClick={genPassword}>បង្កើតស្វ័យប្រវត្តិ</Button>
            </div>
          </Field>
        </div>

        <Alert>{err}</Alert>
        <div className="flex gap-2">
          <Button disabled={busy}>{busy ? 'កំពុងបង្កើត…' : 'បង្កើតគណនី'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>បោះបង់</Button>
        </div>
      </form>
    </Card>
  );
}

function Accounts() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [msg, setMsg] = useState({});
  const [adding, setAdding] = useState(false);
  const [dialog, setDialog] = useState(null); // { type: 'password'|'email', row }
  const [val, setVal] = useState('');
  const [events, setEvents] = useState(null);
  const [evFilter, setEvFilter] = useState({ user: null, failedOnly: false });

  async function load() {
    const res = await fetch('/api/admin/accounts');
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ tone: 'red', text: j.error }); setRows([]); return; }
    setRows(j.rows);
  }
  async function loadEvents() {
    let qy = sb.from('auth_events').select('*').order('created_at', { ascending: false }).limit(100);
    if (evFilter.user) qy = qy.eq('user_id', evFilter.user.id);
    if (evFilter.failedOnly) qy = qy.in('event', ['sign_in_failed', 'sign_in_locked']);
    const { data } = await qy;
    setEvents(data || []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadEvents(); }, [evFilter]);

  async function act(action, row, extra = {}, ask) {
    if (ask && !confirm(ask)) return;
    const r = await postJSON('/api/admin/accounts', { action, user_id: row.id, ...extra });
    setMsg(r.ok ? { tone: 'green', text: r.message } : { tone: 'red', text: r.error });
    if (r.ok) { setDialog(null); setVal(''); load(); loadEvents(); }
  }

  const shown = useMemo(() => (rows || []).filter((r) =>
    (!kind || r.kind === kind) &&
    (!q || `${r.email} ${r.name} ${r.member_code || ''}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, kind]);

  const stats = useMemo(() => {
    const r = rows || [];
    const week = Date.now() - 7 * 864e5;
    return {
      total: r.length,
      disabled: r.filter((x) => x.disabled).length,
      active7: r.filter((x) => x.last_sign_in_at && new Date(x.last_sign_in_at).getTime() > week).length,
      never: r.filter((x) => !x.last_sign_in_at).length,
    };
  }, [rows]);

  return (
    <>
      <PageTitle title="គណនី និងការចូលប្រព័ន្ធ" sub="គ្រប់គ្រងពាក្យសម្ងាត់ បិទ/បើកគណនី បណ្ដេញចេញ និងមើលកំណត់ហេតុ"
        actions={!adding && <Button onClick={() => { setAdding(true); setMsg({}); }}>+ គណនីថ្មី</Button>} />

      {adding && <NewAccount onCancel={() => setAdding(false)}
        onDone={(text) => { setAdding(false); setMsg({ tone: 'green', text }); load(); loadEvents(); }} />}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['គណនីសរុប', stats.total], ['ចូលក្នុង ៧ ថ្ងៃ', stats.active7], ['មិនដែលចូល', stats.never], ['បានបិទ', stats.disabled]].map(([l, v]) => (
          <Card key={l}><div className="text-xs text-gray-500">{l}</div><div className="mt-1 text-2xl font-bold text-brand-700">{rows ? v : '…'}</div></Card>
        ))}
      </div>

      <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>

      {dialog && (
        <Card className="mb-4 border-brand-200 bg-brand-50">
          <form onSubmit={(e) => { e.preventDefault(); dialog.type === 'password' ? act('set_password', dialog.row, { password: val }) : act('change_email', dialog.row, { email: val }); }}
            className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1">
              <div className="mb-1 text-sm font-medium">{dialog.type === 'password' ? 'ពាក្យសម្ងាត់ថ្មីសម្រាប់' : 'Email ថ្មីសម្រាប់'} {dialog.row.email}</div>
              {dialog.type === 'password'
                ? <PasswordInput required minLength={8} autoFocus autoComplete="new-password" placeholder="៨ តួ អក្សរ+លេខ" value={val} onChange={(e) => setVal(e.target.value)} />
                : <Input type="email" required autoFocus value={val} onChange={(e) => setVal(e.target.value)} />}
            </div>
            <Button>រក្សាទុក</Button>
            <Button type="button" variant="secondary" onClick={() => { setDialog(null); setVal(''); }}>បោះបង់</Button>
          </form>
          {dialog.type === 'password' && <p className="mt-2 text-xs text-gray-500">អ្នកប្រើនឹងត្រូវចាកចេញពីគ្រប់ឧបករណ៍ ហើយចូលវិញដោយពាក្យសម្ងាត់ថ្មី។ សូមប្រាប់គេដោយផ្ទាល់។</p>}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="ស្វែងរក Email ឈ្មោះ លេខសមាជិក…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-40">
            <option value="">ទាំងអស់</option><option value="staff">បុគ្គលិក</option><option value="member">សមាជិក</option><option value="none">មិនភ្ជាប់</option>
          </Select>
        </div>
        {!rows ? <Spinner /> : shown.length === 0 ? <Empty /> : (
          <Table head={['គណនី', 'ប្រភេទ', 'ចូលចុងក្រោយ', 'ស្ថានភាព', 'សកម្មភាព']}>
            {shown.map((r) => (
              <tr key={r.id} className={r.disabled ? 'bg-gray-50 text-gray-500' : ''}>
                <td className={td}>
                  <div className="font-medium">{r.name || '—'}{r.self && <span className="text-xs text-gray-400"> (អ្នក)</span>}</div>
                  <div className="text-xs text-gray-500">{r.email}</div>
                </td>
                <td className={td}>
                  {KIND[r.kind]}
                  {r.role && <div className="text-xs text-gray-400">{r.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : 'បណ្ណារក្ស'}</div>}
                  {r.member_id && <Link href={`/admin/members/${r.member_id}`} className="block text-xs text-brand-600">{r.member_code}</Link>}
                </td>
                <td className={td}>{r.last_sign_in_at ? fmtDateTime(r.last_sign_in_at) : <span className="text-xs text-gray-400">មិនដែល</span>}</td>
                <td className={td}>{r.disabled ? <Badge tone="red">បានបិទ</Badge> : <Badge tone="green">សកម្ម</Badge>}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <button className="text-brand-600 hover:underline" onClick={() => { setDialog({ type: 'password', row: r }); setVal(''); }}>កំណត់ពាក្យសម្ងាត់</button>
                    <button className="text-brand-600 hover:underline" onClick={() => { setDialog({ type: 'email', row: r }); setVal(r.email); }}>ប្ដូរ Email</button>
                    <button className="text-brand-600 hover:underline" onClick={() => setEvFilter({ user: r, failedOnly: false })}>កំណត់ហេតុ</button>
                    {!r.self && <>
                      <button className="text-amber-700 hover:underline" onClick={() => act('signout', r, {}, `បណ្ដេញ ${r.email} ចេញពីគ្រប់ឧបករណ៍?`)}>បណ្ដេញចេញ</button>
                      {r.disabled
                        ? <button className="text-green-700 hover:underline" onClick={() => act('enable', r)}>បើកវិញ</button>
                        : <button className="text-red-600 hover:underline" onClick={() => act('disable', r, {}, `បិទគណនី ${r.email}? អ្នកប្រើនឹងចូលមិនបានទៀត។`)}>បិទ</button>}
                      <button className="text-red-600 hover:underline" onClick={() => act('delete', r, {}, `លុបគណនីចូលប្រព័ន្ធ ${r.email} ជាអចិន្ត្រៃយ៍?${r.kind === 'member' ? ' (ព័ត៌មានសមាជិកនៅដដែល)' : ''}`)}>លុប</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">កំណត់ហេតុចូល/ចេញ {evFilter.user && <span className="text-sm font-normal text-gray-500">— {evFilter.user.email}</span>}</h2>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={evFilter.failedOnly} onChange={(e) => setEvFilter({ ...evFilter, failedOnly: e.target.checked })} /> តែការចូលបរាជ័យ</label>
            {evFilter.user && <button className="text-brand-600" onClick={() => setEvFilter({ ...evFilter, user: null })}>បង្ហាញទាំងអស់</button>}
          </div>
        </div>
        {!events ? <Spinner /> : events.length === 0 ? <Empty>មិនទាន់មានកំណត់ត្រា</Empty> : (
          <Table head={['ពេល', 'Email', 'សកម្មភាព', 'ឧបករណ៍', 'IP']}>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td className={`${td} whitespace-nowrap`}>{fmtDateTime(ev.created_at)}</td>
                <td className={td}>{ev.email || '—'}</td>
                <td className={td}><StatusBadge map={AUTH_EVENT} value={ev.event} /></td>
                <td className={td}>{deviceName(ev.user_agent)}</td>
                <td className={`${td} text-xs text-gray-500`}>{ev.ip || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export default function AccountsPage() { return <AdminOnly><Accounts /></AdminOnly>; }
