'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/lib/useAuth';
import { postJSON, signOut, AUTH_EVENT, deviceName, fmtDateTime } from '@/lib/authClient';
import { Card, Field, PasswordInput, Button, Alert, Spinner, Table, td, StatusBadge, Empty } from '@/components/ui';

export default function AccountPage() {
  const { loading, user, staff, member } = useAuth();
  const [f, setF] = useState({ current: '', password: '', confirm: '' });
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from('auth_events').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(15)
      .then(({ data }) => setEvents(data || []));
  }, [user]);

  async function change(e) {
    e.preventDefault();
    if (f.password !== f.confirm) return setMsg({ tone: 'red', text: 'ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នា' });
    setBusy(true);
    const r = await postJSON('/api/auth/password', { current: f.current, password: f.password });
    setMsg(r.ok ? { tone: 'green', text: 'បានប្ដូរពាក្យសម្ងាត់ — ឧបករណ៍ផ្សេងៗត្រូវបានចាកចេញ' } : { tone: 'red', text: r.error });
    if (r.ok) setF({ current: '', password: '', confirm: '' });
    setBusy(false);
  }

  async function signOutOthers() {
    if (!confirm('ចាកចេញពីឧបករណ៍ផ្សេងៗទាំងអស់ (រក្សាឧបករណ៍នេះ)?')) return;
    const r = await postJSON('/api/auth/logout', { scope: 'others' });
    setMsg(r.ok ? { tone: 'green', text: 'បានចាកចេញពីឧបករណ៍ផ្សេងៗ' } : { tone: 'red', text: r.error });
  }

  const roleLabel = staff ? (staff.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : 'បណ្ណារក្ស') : member ? `សមាជិក · ${member.member_code}` : 'អ្នកប្រើ';

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {loading ? <Spinner /> : (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold">{staff?.name || member?.name || 'គណនីរបស់ខ្ញុំ'}</h1>
                  <p className="text-sm text-gray-500">{user?.email} · {roleLabel}</p>
                  <p className="text-xs text-gray-400">ចូលចុងក្រោយ៖ {fmtDateTime(user?.last_sign_in_at)}</p>
                </div>
                <div className="flex gap-2">
                  {staff && <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">ផ្នែកគ្រប់គ្រង</Link>}
                  {member && <Link href="/me" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">សៀវភៅខ្ចី</Link>}
                </div>
              </div>
            </Card>

            <Alert tone={msg.tone}>{msg.text}</Alert>

            <Card>
              <h2 className="mb-3 font-semibold">ប្ដូរពាក្យសម្ងាត់</h2>
              <form onSubmit={change} className="grid gap-3 md:grid-cols-3">
                <Field label="ពាក្យសម្ងាត់បច្ចុប្បន្ន"><PasswordInput autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
                <Field label="ពាក្យសម្ងាត់ថ្មី" hint="៨ តួ អក្សរ+លេខ"><PasswordInput autoComplete="new-password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
                <Field label="បញ្ជាក់ពាក្យថ្មី"><PasswordInput autoComplete="new-password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
                <div className="md:col-span-3"><Button disabled={busy}>{busy ? 'កំពុងរក្សាទុក…' : 'ប្ដូរពាក្យសម្ងាត់'}</Button></div>
              </form>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">ការចូលប្រព័ន្ធ</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => signOut('local', '/login?msg=out')}>ចាកចេញ</Button>
                <Button variant="secondary" onClick={signOutOthers}>ចាកចេញពីឧបករណ៍ផ្សេងៗ</Button>
                <Button variant="danger" onClick={() => confirm('ចាកចេញពីគ្រប់ឧបករណ៍ រួមទាំងឧបករណ៍នេះ?') && signOut('global', '/login?msg=out')}>ចាកចេញពីគ្រប់ឧបករណ៍</Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">ប្រើពេលអ្នកភ្លេចចាកចេញនៅកុំព្យូទ័របណ្ណាល័យ ឬសង្ស័យថាមានគេប្រើគណនីអ្នក។</p>
            </Card>

            <Card>
              <h2 className="mb-2 font-semibold">សកម្មភាពថ្មីៗ</h2>
              {!events ? <Spinner /> : events.length === 0 ? <Empty>មិនទាន់មានកំណត់ត្រា</Empty> : (
                <Table head={['ពេល', 'សកម្មភាព', 'ឧបករណ៍', 'IP']}>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className={td}>{fmtDateTime(ev.created_at)}</td>
                      <td className={td}><StatusBadge map={AUTH_EVENT} value={ev.event} /></td>
                      <td className={td}>{deviceName(ev.user_agent)}</td>
                      <td className={`${td} text-xs text-gray-500`}>{ev.ip || '—'}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
