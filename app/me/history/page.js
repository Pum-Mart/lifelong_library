'use client';
import { useEffect, useState } from 'react';
import MemberShell from '@/components/MemberShell';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/lib/useAuth';
import { fmtDate, LOAN_STATUS } from '@/lib/format';
import { Card, Table, td, StatusBadge, Empty, Spinner } from '@/components/ui';

export default function MyHistory() {
  const { member, loading } = useAuth();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (member) supabaseBrowser().from('v_loans').select('*').eq('member_id', member.id).order('loan_date', { ascending: false }).then(({ data }) => setRows(data || []));
  }, [member]);
  return (
    <MemberShell>
      <Card>
        <h1 className="mb-2 font-semibold">ប្រវត្តិខ្ចី {rows && `(${rows.length})`}</h1>
        {loading || (member && !rows) ? <Spinner /> : !rows?.length ? <Empty /> : (
          <Table head={['សៀវភៅ', 'ថ្ងៃខ្ចី', 'ត្រូវសង', 'ថ្ងៃសង', 'ស្ថានភាព']}>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.title}</td><td className={td}>{fmtDate(l.loan_date)}</td>
                <td className={td}>{fmtDate(l.due_date)}</td><td className={td}>{fmtDate(l.return_date)}</td>
                <td className={td}><StatusBadge map={LOAN_STATUS} value={l.loan_status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </MemberShell>
  );
}
