'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStaff } from '@/lib/staffContext';
import { riel, fmtDate, errText, LOAN_STATUS, FINE_STATUS, FINE_TYPE } from '@/lib/format';
import MemberForm from '@/components/MemberForm';
import QRImage from '@/components/QRImage';
import { PageTitle, Card, Table, td, StatusBadge, Button, Input, Alert, Spinner, Empty } from '@/components/ui';

export default function MemberProfile({ params }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const staff = useStaff();
  const [m, setM] = useState(undefined);
  const [st, setSt] = useState(null);
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [acc, setAcc] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState({});
  const [edit, setEdit] = useState(false);

  async function load() {
    const { data } = await sb.from('members').select('*, member_types(*)').eq('id', params.id).maybeSingle();
    setM(data);
    const [s, l, f] = await Promise.all([
      sb.from('v_member_status').select('*').eq('member_id', params.id).maybeSingle(),
      sb.from('v_loans').select('*').eq('member_id', params.id).order('loan_date', { ascending: false }).limit(100),
      sb.from('fines').select('*').eq('member_id', params.id).order('created_at', { ascending: false }),
    ]);
    setSt(s.data); setLoans(l.data || []); setFines(f.data || []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [params.id]);

  async function pay(id) {
    const { error } = await sb.rpc('pay_fine', { p_fine_id: id });
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: 'បានទទួលប្រាក់' });
    load();
  }
  async function renewCard() {
    const d = new Date(Math.max(Date.now(), new Date(m.expiry_date).getTime()));
    d.setFullYear(d.getFullYear() + 1);
    const { error } = await sb.from('members').update({ expiry_date: d.toISOString().slice(0, 10), status: 'active' }).eq('id', m.id);
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: `បានបន្តកាតដល់ ${fmtDate(d)}` });
    load();
  }
  async function createAccount(e) {
    e.preventDefault();
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'member', member_id: m.id, ...acc }) });
    const j = await res.json();
    setMsg(res.ok ? { tone: 'green', text: `បានបង្កើតគណនី ${acc.email}` } : { tone: 'red', text: j.error });
    if (res.ok) { setAcc({ email: '', password: '' }); load(); }
  }
  async function remove() {
    if (!confirm(`លុបសមាជិក ${m.name}?`)) return;
    const { error } = await sb.from('members').delete().eq('id', m.id);
    if (error) return setMsg({ tone: 'red', text: errText(error) + ' — អាចប្ដូរស្ថានភាពជា «អសកម្ម» ជំនួសវិញ' });
    router.push('/admin/members');
  }

  if (m === undefined) return <Spinner />;
  if (!m) return <Empty>រកមិនឃើញសមាជិក</Empty>;
  const unpaid = fines.filter((f) => f.status === 'unpaid');

  return (
    <>
      <PageTitle title={m.name} sub={`${m.member_code} · ${m.member_types.name}`}
        actions={<>
          <Link href={`/admin/cards?ids=${m.id}`} className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">បោះពុម្ពកាត</Link>
          <Button variant="secondary" onClick={renewCard}>បន្តកាត ១ ឆ្នាំ</Button>
          <Button variant="secondary" onClick={() => setEdit(!edit)}>{edit ? 'បិទការកែ' : 'កែព័ត៌មាន'}</Button>
          {staff?.role === 'admin' && <Button variant="danger" onClick={remove}>លុប</Button>}
        </>} />
      <Alert tone={msg.tone}>{msg.text}</Alert>
      {edit && <div className="mt-3"><MemberForm member={m} onSaved={() => { setEdit(false); load(); }} /></div>}

      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr_180px]">
        <Card className="flex gap-3">
          {m.photo_url ? <img src={m.photo_url} alt="" className="h-28 w-20 rounded object-cover" /> : <div className="h-28 w-20 rounded bg-gray-100" />}
          <dl className="text-sm leading-7">
            <div>ភេទ៖ {m.gender || '—'}</div><div>ទូរស័ព្ទ៖ {m.phone || '—'}</div>
            <div>អាសយដ្ឋាន៖ {m.address || '—'}</div>
            <div>ចុះឈ្មោះ៖ {fmtDate(m.joined_date)} · ផុត៖ {fmtDate(m.expiry_date)}</div>
          </dl>
        </Card>
        <Card className="grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="text-2xl font-bold text-brand-700">{st?.open_loans ?? 0}/{m.member_types.max_books}</div>កំពុងខ្ចី</div>
          <div><div className="text-2xl font-bold text-red-600">{st?.overdue_loans ?? 0}</div>ហួសកំណត់</div>
          <div><div className="text-lg font-bold text-amber-600">{riel(st?.unpaid_fines)}</div>ពិន័យ</div>
        </Card>
        <Card className="text-center"><QRImage value={m.member_code} size={120} className="mx-auto" /></Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">ប្រវត្តិខ្ចី</h2>
        {loans.length === 0 ? <Empty /> : (
          <Table head={['សៀវភៅ', 'ខ្ចី', 'ត្រូវសង', 'សង', 'ស្ថានភាព']}>
            {loans.map((l) => (
              <tr key={l.id}><td className={td}>{l.title}<div className="text-xs text-gray-400">{l.barcode}</div></td><td className={td}>{fmtDate(l.loan_date)}</td><td className={td}>{fmtDate(l.due_date)}</td><td className={td}>{fmtDate(l.return_date)}</td><td className={td}><StatusBadge map={LOAN_STATUS} value={l.loan_status} /></td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">ពិន័យ {unpaid.length > 0 && <span className="text-red-600">({unpaid.length} មិនទាន់បង់)</span>}</h2>
        {fines.length === 0 ? <Empty>មិនមានពិន័យ</Empty> : (
          <Table head={['ថ្ងៃ', 'ប្រភេទ', 'ចំនួន', 'ស្ថានភាព', '']}>
            {fines.map((f) => (
              <tr key={f.id}><td className={td}>{fmtDate(f.created_at)}</td><td className={td}>{FINE_TYPE[f.type]}</td><td className={td}>{riel(f.amount)}</td><td className={td}><StatusBadge map={FINE_STATUS} value={f.status} />{f.waived_reason && <div className="text-xs text-gray-400">{f.waived_reason}</div>}</td><td className={td}>{f.status === 'unpaid' && <Button variant="ghost" onClick={() => pay(f.id)}>ទទួលប្រាក់</Button>}</td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">គណនីចូលប្រព័ន្ធ</h2>
        {m.auth_user_id ? <div className="text-sm"><p className="text-green-700">✓ សមាជិកនេះមានគណនីរួចហើយ — អាចមើលសៀវភៅខ្ចី និងបន្តពេលដោយខ្លួនឯង</p>{staff?.role === 'admin' && <Link href="/admin/settings/accounts" className="mt-1 inline-block text-brand-600 hover:underline">គ្រប់គ្រងគណនី (ពាក្យសម្ងាត់ / បិទ / បណ្ដេញចេញ) →</Link>}</div> : (
          <form onSubmit={createAccount} className="flex flex-wrap gap-2">
            <Input type="email" required placeholder="Email" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} className="max-w-xs" />
            <Input type="text" required minLength={8} placeholder="ពាក្យសម្ងាត់ (៨ តួ អក្សរ+លេខ)" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} className="max-w-xs" />
            <Button>បង្កើតគណនី</Button>
          </form>
        )}
      </Card>
    </>
  );
}
