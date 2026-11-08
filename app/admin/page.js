'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { riel, fmtDate, today } from '@/lib/format';
import { PageTitle, Stat, Card, LinkButton, Table, td, Empty } from '@/components/ui';

export default function Dashboard() {
  const sb = supabaseBrowser();
  const [s, setS] = useState({});
  const [overdue, setOverdue] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      const t = today();
      const cnt = (q) => q.then((r) => r.count ?? 0);
      const [books, copies, members, onLoan, od, loansToday, returnsToday] = await Promise.all([
        cnt(sb.from('books').select('*', { count: 'exact', head: true })),
        cnt(sb.from('book_copies').select('*', { count: 'exact', head: true }).neq('status', 'withdrawn')),
        cnt(sb.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        cnt(sb.from('loans').select('*', { count: 'exact', head: true }).is('return_date', null)),
        cnt(sb.from('loans').select('*', { count: 'exact', head: true }).is('return_date', null).lt('due_date', t)),
        cnt(sb.from('loans').select('*', { count: 'exact', head: true }).eq('loan_date', t)),
        cnt(sb.from('loans').select('*', { count: 'exact', head: true }).eq('return_date', t)),
      ]);
      const { data: ms } = await sb.from('v_member_status').select('unpaid_fines');
      const unpaid = (ms || []).reduce((a, r) => a + r.unpaid_fines, 0);
      setS({ books, copies, members, onLoan, od, loansToday, returnsToday, unpaid });
      const { data: o } = await sb.from('v_loans').select('*').eq('loan_status', 'overdue').order('due_date').limit(8);
      setOverdue(o || []);
      const { data: r } = await sb.from('v_loans').select('*').order('created_at', { ascending: false }).limit(8);
      setRecent(r || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageTitle title="Dashboard" sub={`ថ្ងៃទី ${fmtDate(today())}`}
        actions={<><LinkButton href="/admin/checkout" className="px-5 py-3 text-base">ខ្ចីសៀវភៅ</LinkButton><LinkButton href="/admin/return" variant="secondary" className="px-5 py-3 text-base">សងសៀវភៅ</LinkButton></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ចំណងជើងសៀវភៅ" value={s.books ?? '…'} href="/admin/books" />
        <Stat label="ក្បាលសៀវភៅសរុប" value={s.copies ?? '…'} />
        <Stat label="សមាជិកសកម្ម" value={s.members ?? '…'} href="/admin/members" />
        <Stat label="កំពុងខ្ចី" value={s.onLoan ?? '…'} href="/admin/loans" />
        <Stat label="ហួសកំណត់" value={s.od ?? '…'} tone="red" href="/admin/loans?status=overdue" />
        <Stat label="ពិន័យមិនទាន់បង់" value={s.unpaid !== undefined ? riel(s.unpaid) : '…'} tone="amber" href="/admin/fines" />
        <Stat label="ខ្ចីថ្ងៃនេះ" value={s.loansToday ?? '…'} tone="green" />
        <Stat label="សងថ្ងៃនេះ" value={s.returnsToday ?? '…'} tone="green" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold text-red-700">ហួសកំណត់យូរជាងគេ</h2>
          {overdue.length === 0 ? <Empty>មិនមានសៀវភៅហួសកំណត់ 🎉</Empty> : (
            <Table head={['សមាជិក', 'សៀវភៅ', 'ហួស', 'ពិន័យ']}>
              {overdue.map((l) => (
                <tr key={l.id}>
                  <td className={td}>{l.member_name}<div className="text-xs text-gray-400">{l.member_phone}</div></td>
                  <td className={td}>{l.title}</td><td className={td}>{l.days_late} ថ្ងៃ</td><td className={td}>{riel(l.accrued_fine)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">សកម្មភាពថ្មីៗ</h2>
          {recent.length === 0 ? <Empty /> : (
            <Table head={['សមាជិក', 'សៀវភៅ', 'ខ្ចី', 'សង']}>
              {recent.map((l) => (
                <tr key={l.id}><td className={td}>{l.member_name}</td><td className={td}>{l.title}</td><td className={td}>{fmtDate(l.loan_date)}</td><td className={td}>{fmtDate(l.return_date)}</td></tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
