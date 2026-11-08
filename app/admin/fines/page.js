'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStaff } from '@/lib/staffContext';
import { riel, fmtDate, errText, FINE_STATUS, FINE_TYPE } from '@/lib/format';
import { PageTitle, Card, Table, td, StatusBadge, Button, Alert, Spinner, Empty, Stat } from '@/components/ui';

export default function Fines() {
  const sb = supabaseBrowser();
  const staff = useStaff();
  const [status, setStatus] = useState('unpaid');
  const [rows, setRows] = useState(null);
  const [accruing, setAccruing] = useState(0);
  const [msg, setMsg] = useState({});
  const [receipt, setReceipt] = useState(null);

  async function load() {
    setRows(null);
    let q = sb.from('fines').select('*, members(name, member_code, phone), loans(book_copies(books(title)))').order('created_at', { ascending: false }).limit(300);
    if (status !== 'all') q = q.eq('status', status);
    const { data } = await q;
    setRows(data || []);
    const { data: od } = await sb.from('v_loans').select('accrued_fine').eq('loan_status', 'overdue');
    setAccruing((od || []).reduce((a, r) => a + r.accrued_fine, 0));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [status]);

  async function pay(f) {
    const { error } = await sb.rpc('pay_fine', { p_fine_id: f.id });
    if (error) return setMsg({ tone: 'red', text: errText(error) });
    setMsg({ tone: 'green', text: `បានទទួល ${riel(f.amount)} ពី ${f.members.name}` });
    setReceipt({ ...f, paid_at: new Date().toISOString() });
    load();
  }
  async function waive(f) {
    const reason = prompt('មូលហេតុលើកលែង៖');
    if (!reason) return;
    const { error } = await sb.rpc('waive_fine', { p_fine_id: f.id, p_reason: reason });
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: 'បានលើកលែង' });
    load();
  }

  const total = (rows || []).filter((r) => r.status === 'unpaid').reduce((a, r) => a + r.amount, 0);
  const tab = (v, l) => <button onClick={() => setStatus(v)} className={`rounded-lg px-3 py-1.5 text-sm ${status === v ? 'bg-brand-600 text-white' : 'border bg-white'}`}>{l}</button>;

  return (
    <>
      <div className="no-print">
        <PageTitle title="ពិន័យ" />
        <div className="mb-4 grid grid-cols-2 gap-3 md:w-1/2">
          <Stat label="ពិន័យកត់ត្រា មិនទាន់បង់" value={riel(total)} tone="red" />
          <Stat label="ពិន័យកំពុងកើន (សៀវភៅមិនទាន់សង)" value={riel(accruing)} tone="amber" />
        </div>
        <div className="mb-3 flex gap-2">{tab('unpaid', 'មិនទាន់បង់')}{tab('paid', 'បានបង់')}{tab('waived', 'លើកលែង')}{tab('all', 'ទាំងអស់')}</div>
        <Alert tone={msg.tone}>{msg.text}</Alert>
        <Card className="mt-3">
          {!rows ? <Spinner /> : rows.length === 0 ? <Empty /> : (
            <Table head={['ថ្ងៃ', 'សមាជិក', 'សៀវភៅ', 'ប្រភេទ', 'ចំនួន', 'ស្ថានភាព', '']}>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className={td}>{fmtDate(f.created_at)}</td>
                  <td className={td}><Link href={`/admin/members/${f.member_id}`} className="text-brand-700 hover:underline">{f.members?.name}</Link><div className="text-xs text-gray-400">{f.members?.member_code}</div></td>
                  <td className={td}>{f.loans?.book_copies?.books?.title || '—'}</td>
                  <td className={td}>{FINE_TYPE[f.type]}</td>
                  <td className={td}>{riel(f.amount)}</td>
                  <td className={td}><StatusBadge map={FINE_STATUS} value={f.status} />{f.paid_at && <div className="text-xs text-gray-400">{fmtDate(f.paid_at)}</div>}{f.waived_reason && <div className="text-xs text-gray-400">{f.waived_reason}</div>}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {f.status === 'unpaid' && <>
                      <Button variant="ghost" onClick={() => pay(f)}>ទទួលប្រាក់</Button>
                      {staff?.role === 'admin' && <Button variant="ghost" className="text-gray-500" onClick={() => waive(f)}>លើកលែង</Button>}
                    </>}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {receipt && (
        <div className="mt-4">
          <div className="mx-auto w-72 border border-dashed p-4 text-sm print:border-0">
            <div className="text-center font-bold">បង្កាន់ដៃបង់ពិន័យ</div>
            <div className="mt-2">សមាជិក៖ {receipt.members.name} ({receipt.members.member_code})</div>
            <div>ប្រភេទ៖ {FINE_TYPE[receipt.type]}</div>
            <div>សៀវភៅ៖ {receipt.loans?.book_copies?.books?.title || '—'}</div>
            <div className="mt-1 text-lg font-bold">ចំនួន៖ {riel(receipt.amount)}</div>
            <div>ថ្ងៃ៖ {fmtDate(receipt.paid_at)} · ទទួលដោយ {staff?.name}</div>
          </div>
          <div className="no-print mt-2 text-center"><Button variant="secondary" onClick={() => window.print()}>បោះពុម្ពបង្កាន់ដៃ</Button></div>
        </div>
      )}
    </>
  );
}
