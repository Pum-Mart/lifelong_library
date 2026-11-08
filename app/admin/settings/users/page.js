'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStaff } from '@/lib/staffContext';
import { errText, fmtDate } from '@/lib/format';
import AdminOnly from '@/components/AdminOnly';
import { PageTitle, Card, Input, Select, Button, Alert, Table, td } from '@/components/ui';

function Users() {
  const sb = supabaseBrowser();
  const me = useStaff();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'librarian' });
  const [msg, setMsg] = useState({});

  const load = () => sb.from('staff').select('*').order('created_at').then(({ data }) => setRows(data || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'staff', ...f }) });
    const j = await res.json();
    setMsg(res.ok ? { tone: 'green', text: `បានបង្កើតគណនី ${f.email}` } : { tone: 'red', text: j.error });
    if (res.ok) { setF({ name: '', email: '', password: '', role: 'librarian' }); load(); }
  }
  async function setRole(id, role) {
    const { error } = await sb.from('staff').update({ role }).eq('id', id);
    if (error) setMsg({ tone: 'red', text: errText(error) });
    load();
  }
  async function remove(s) {
    if (!confirm(`លុបគណនី ${s.name}?`)) return;
    const res = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: s.id }) });
    const j = await res.json();
    setMsg(res.ok ? { tone: 'green', text: 'បានលុប' } : { tone: 'red', text: j.error });
    load();
  }

  return (
    <>
      <PageTitle title="បុគ្គលិក និងតួនាទី" />
      <Card>
        <h2 className="mb-3 font-semibold">បន្ថែមបុគ្គលិក</h2>
        <form onSubmit={add} className="grid gap-2 md:grid-cols-5">
          <Input required placeholder="ឈ្មោះ" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input required minLength={8} placeholder="ពាក្យសម្ងាត់" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="librarian">បណ្ណារក្ស</option><option value="admin">អ្នកគ្រប់គ្រង</option></Select>
          <Button>បង្កើត</Button>
        </form>
        <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>
      </Card>
      <Card className="mt-4">
        <Table head={['ឈ្មោះ', 'តួនាទី', 'បង្កើត', '']}>
          {rows.map((s) => (
            <tr key={s.id}>
              <td className={td}>{s.name}{s.id === me?.id && <span className="text-xs text-gray-400"> (អ្នក)</span>}</td>
              <td className={td}>
                <Select value={s.role} disabled={s.id === me?.id} onChange={(e) => setRole(s.id, e.target.value)} className="w-40">
                  <option value="librarian">បណ្ណារក្ស</option><option value="admin">អ្នកគ្រប់គ្រង</option>
                </Select>
              </td>
              <td className={td}>{fmtDate(s.created_at)}</td>
              <td className={td}>{s.id !== me?.id && <button className="text-xs text-red-600" onClick={() => remove(s)}>លុប</button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

export default function UsersPage() { return <AdminOnly><Users /></AdminOnly>; }
