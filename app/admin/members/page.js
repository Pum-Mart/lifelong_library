'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fmtDate, riel, MEMBER_STATUS, today } from '@/lib/format';
import { PageTitle, Card, Table, td, Input, Select, Button, LinkButton, StatusBadge, Spinner, Empty } from '@/components/ui';

export default function Members() {
  const sb = supabaseBrowser();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState(null);
  const [st, setSt] = useState({});

  async function load() {
    setRows(null);
    let query = sb.from('members').select('*, member_types(name)').order('member_code', { ascending: false }).limit(300);
    if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,member_code.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`);
    if (type) query = query.eq('type_id', type);
    if (status) query = query.eq('status', status);
    const { data } = await query;
    setRows(data || []);
    const ids = (data || []).map((m) => m.id);
    if (ids.length) {
      const { data: s } = await sb.from('v_member_status').select('*').in('member_id', ids);
      setSt(Object.fromEntries((s || []).map((r) => [r.member_id, r])));
    }
  }

  useEffect(() => {
    sb.from('member_types').select('*').order('id').then(({ data }) => setTypes(data || []));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <>
      <PageTitle title="បញ្ជីសមាជិក" actions={<LinkButton href="/admin/members/new">+ សមាជិកថ្មី</LinkButton>} />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="ឈ្មោះ លេខសមាជិក ទូរស័ព្ទ…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[200px]">
            <option value="">គ្រប់ប្រភេទ</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[160px]">
            <option value="">គ្រប់ស្ថានភាព</option>{Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Button variant="secondary">ស្វែងរក</Button>
        </form>
        {!rows ? <Spinner /> : rows.length === 0 ? <Empty /> : (
          <Table head={['លេខ', 'ឈ្មោះ', 'ប្រភេទ', 'ទូរស័ព្ទ', 'ផុតកំណត់', 'ខ្ចី', 'ពិន័យ', 'ស្ថានភាព']}>
            {rows.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className={td}>{m.member_code}</td>
                <td className={td}><Link href={`/admin/members/${m.id}`} className="font-medium text-brand-700 hover:underline">{m.name}</Link></td>
                <td className={td}>{m.member_types?.name}</td>
                <td className={td}>{m.phone || '—'}</td>
                <td className={`${td} ${m.expiry_date < today() ? 'text-red-600' : ''}`}>{fmtDate(m.expiry_date)}</td>
                <td className={td}>{st[m.id]?.open_loans ?? 0}{st[m.id]?.overdue_loans > 0 && <span className="text-red-600"> ({st[m.id].overdue_loans} ហួស)</span>}</td>
                <td className={td}>{st[m.id]?.unpaid_fines ? riel(st[m.id].unpaid_fines) : '—'}</td>
                <td className={td}><StatusBadge map={MEMBER_STATUS} value={m.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
