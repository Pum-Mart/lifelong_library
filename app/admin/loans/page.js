'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { riel, fmtDate, errText, LOAN_STATUS } from '@/lib/format';
import { PageTitle, Card, Table, td, StatusBadge, Button, Alert, Input, Spinner, Empty } from '@/components/ui';

function Loans() {
  const sb = supabaseBrowser();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || 'open');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState({});

  async function load() {
    setRows(null);
    let query = sb.from('v_loans').select('*').limit(300);
    if (status === 'open') query = query.is('return_date', null).order('due_date');
    else if (status === 'overdue') query = query.eq('loan_status', 'overdue').order('due_date');
    else query = query.order('loan_date', { ascending: false });
    if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,member_name.ilike.%${q.trim()}%,member_code.ilike.%${q.trim()}%,barcode.ilike.%${q.trim()}%`);
    const { data } = await query;
    setRows(data || []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [status]);

  async function renew(id) {
    const { data, error } = await sb.rpc('renew_loan', { p_loan_id: id });
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: `បន្តពេលរួច — ថ្ងៃសងថ្មី ${fmtDate(data)}` });
    load();
  }
  async function lost(l) {
    if (!confirm(`កត់ថា «${l.title}» បាត់? សមាជិកនឹងត្រូវពិន័យតម្លៃសៀវភៅ + ថ្លៃរៀបចំ`)) return;
    const { data, error } = await sb.rpc('mark_lost', { p_loan_id: l.id });
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'amber', text: `បានកត់ថាបាត់ — ពិន័យ ${riel(data)}` });
    load();
  }

  const tab = (v, l) => <button onClick={() => setStatus(v)} className={`rounded-lg px-3 py-1.5 text-sm ${status === v ? 'bg-brand-600 text-white' : 'bg-white border'}`}>{l}</button>;

  return (
    <>
      <PageTitle title="កំពុងខ្ចី និងហួសកំណត់" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tab('open', 'កំពុងខ្ចី')}{tab('overdue', 'ហួសកំណត់')}{tab('all', 'ទាំងអស់')}
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="ml-auto flex gap-2">
          <Input placeholder="ស្វែងរក…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button variant="secondary">ស្វែងរក</Button>
        </form>
      </div>
      <Alert tone={msg.tone}>{msg.text}</Alert>
      <Card className="mt-3">
        {!rows ? <Spinner /> : rows.length === 0 ? <Empty /> : (
          <Table head={['សៀវភៅ', 'សមាជិក', 'ខ្ចី', 'ត្រូវសង', 'សង', 'ស្ថានភាព', 'ពិន័យ', '']}>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.title}<div className="text-xs text-gray-400">{l.barcode}</div></td>
                <td className={td}>{l.member_name}<div className="text-xs text-gray-400">{l.member_code} {l.member_phone}</div></td>
                <td className={td}>{fmtDate(l.loan_date)}</td>
                <td className={td}>{fmtDate(l.due_date)}{l.renew_count > 0 && <div className="text-xs text-gray-400">បន្ត {l.renew_count} ដង</div>}</td>
                <td className={td}>{fmtDate(l.return_date)}</td>
                <td className={td}><StatusBadge map={LOAN_STATUS} value={l.loan_status} />{l.days_late > 0 && l.loan_status === 'overdue' && <div className="text-xs text-red-600">{l.days_late} ថ្ងៃ</div>}</td>
                <td className={td}>{l.accrued_fine ? riel(l.accrued_fine) : '—'}</td>
                <td className={`${td} whitespace-nowrap`}>
                  {!l.return_date && (
                    <>
                      {l.loan_status === 'on_loan' && <Button variant="ghost" onClick={() => renew(l.id)}>បន្ត</Button>}
                      <Button variant="ghost" className="text-red-600" onClick={() => lost(l)}>បាត់</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export default function LoansPage() {
  return <Suspense><Loans /></Suspense>;
}
