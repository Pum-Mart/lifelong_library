'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageTitle, Card, Table, td, Empty } from '@/components/ui';

export default function Top() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from('v_top_books').select('*').limit(20).then(({ data }) => setBooks(data || []));
    sb.from('v_top_members').select('*').limit(20).then(({ data }) => setMembers(data || []));
  }, []);
  const list = (rows, name, sub) => rows.length === 0 ? <Empty /> : (
    <Table head={['#', 'ឈ្មោះ', 'ចំនួនដងខ្ចី']}>
      {rows.map((r, i) => (
        <tr key={i}><td className={td}>{i + 1}</td><td className={td}>{r[name]}{sub && <div className="text-xs text-gray-400">{r[sub]}</div>}</td><td className={td}>{r.loan_count}</td></tr>
      ))}
    </Table>
  );
  return (
    <>
      <PageTitle title="សៀវភៅ និងសមាជិកពេញនិយម" sub="គិតពីការខ្ចីទាំងអស់" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-2 font-semibold">សៀវភៅខ្ចីច្រើនបំផុត</h2>{list(books, 'title')}</Card>
        <Card><h2 className="mb-2 font-semibold">សមាជិកសកម្មបំផុត</h2>{list(members, 'name', 'member_code')}</Card>
      </div>
    </>
  );
}
