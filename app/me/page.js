'use client';
import { useEffect, useState } from 'react';
import MemberShell from '@/components/MemberShell';
import QRImage from '@/components/QRImage';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/lib/useAuth';
import { riel, fmtDate, errText, LOAN_STATUS, FINE_TYPE } from '@/lib/format';
import { Card, Table, td, StatusBadge, Button, Alert, Spinner, Empty } from '@/components/ui';

export default function MyAccount() {
  const sb = supabaseBrowser();
  const { loading, member } = useAuth();
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [msg, setMsg] = useState({});

  async function load() {
    if (!member) return;
    const [l, f, s, t] = await Promise.all([
      sb.from('v_loans').select('*').eq('member_id', member.id).is('return_date', null).order('due_date'),
      sb.from('fines').select('*').eq('member_id', member.id).eq('status', 'unpaid').order('created_at'),
      sb.from('v_member_status').select('*').eq('member_id', member.id).maybeSingle(),
      sb.from('member_types').select('*').eq('id', member.type_id).maybeSingle(),
    ]);
    setLoans(l.data || []); setFines(f.data || []); setStatus(s.data); setType(t.data);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [member]);

  async function renew(id) {
    const { data, error } = await sb.rpc('renew_loan', { p_loan_id: id });
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: `បានបន្តពេល — ថ្ងៃសងថ្មី ${fmtDate(data)}` });
    load();
  }

  if (loading) return <MemberShell><Spinner /></MemberShell>;
  if (!member) return <MemberShell><Empty>គណនីនេះមិនទាន់ភ្ជាប់ជាមួយសមាជិកទេ — សូមទាក់ទងបណ្ណារក្ស</Empty></MemberShell>;

  return (
    <MemberShell>
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <Card>
          <h1 className="text-lg font-bold">{member.name}</h1>
          <p className="text-sm text-gray-500">{member.member_code} · {type?.name}</p>
          <p className="text-sm text-gray-500">កាតផុតកំណត់៖ {fmtDate(member.expiry_date)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-brand-50 p-2"><div className="text-xl font-bold text-brand-700">{status?.open_loans ?? 0}/{type?.max_books ?? '-'}</div>កំពុងខ្ចី</div>
            <div className="rounded-lg bg-red-50 p-2"><div className="text-xl font-bold text-red-600">{status?.overdue_loans ?? 0}</div>ហួសកំណត់</div>
            <div className="rounded-lg bg-amber-50 p-2"><div className="text-xl font-bold text-amber-700">{riel(status?.unpaid_fines)}</div>ពិន័យ</div>
          </div>
        </Card>
        <Card className="text-center">
          <QRImage value={member.member_code} size={150} className="mx-auto" />
          <p className="mt-1 text-xs text-gray-500">បង្ហាញ QR នេះពេលខ្ចីសៀវភៅ</p>
        </Card>
      </div>

      <div className="mt-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>

      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">សៀវភៅកំពុងខ្ចី</h2>
        {loans.length === 0 ? <Empty>មិនមានសៀវភៅកំពុងខ្ចីទេ</Empty> : (
          <Table head={['សៀវភៅ', 'ថ្ងៃខ្ចី', 'ត្រូវសង', 'ស្ថានភាព', 'ពិន័យ', '']}>
            {loans.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.title}<div className="text-xs text-gray-400">{l.barcode}</div></td>
                <td className={td}>{fmtDate(l.loan_date)}</td>
                <td className={td}>{fmtDate(l.due_date)}</td>
                <td className={td}><StatusBadge map={LOAN_STATUS} value={l.loan_status} /></td>
                <td className={td}>{l.accrued_fine ? riel(l.accrued_fine) : '—'}</td>
                <td className={td}>{l.loan_status === 'on_loan' && <Button variant="secondary" onClick={() => renew(l.id)}>បន្តពេល</Button>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {fines.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 font-semibold">ពិន័យមិនទាន់បង់</h2>
          <Table head={['ប្រភេទ', 'ចំនួន', 'ថ្ងៃ']}>
            {fines.map((f) => (
              <tr key={f.id}><td className={td}>{FINE_TYPE[f.type]}</td><td className={td}>{riel(f.amount)}</td><td className={td}>{fmtDate(f.created_at)}</td></tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-gray-500">សូមបង់ពិន័យនៅតុបណ្ណារក្ស។</p>
        </Card>
      )}
    </MemberShell>
  );
}
