'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { riel } from '@/lib/format';
import { PageTitle, Card, Table, td, Stat, Button, Spinner } from '@/components/ui';

const MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const label = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export default function Reports() {
  const [rows, setRows] = useState(null);
  const [byCat, setByCat] = useState([]);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from('v_monthly_stats').select('*').then(({ data }) => setRows(data || []));
    const start = new Date(); start.setDate(1);
    sb.from('loans').select('id, book_copies(books(categories(name)))').gte('loan_date', start.toISOString().slice(0, 10)).then(({ data }) => {
      const m = {};
      (data || []).forEach((r) => { const k = r.book_copies?.books?.categories?.name || 'មិនកំណត់'; m[k] = (m[k] || 0) + 1; });
      setByCat(Object.entries(m).sort((a, b) => b[1] - a[1]));
    });
  }, []);

  if (!rows) return <Spinner />;
  const cur = rows[rows.length - 1] || {};
  const prev = rows[rows.length - 2] || {};
  const max = Math.max(1, ...rows.map((r) => r.loans));
  const diff = (a, b) => (b ? `${a >= b ? '▲' : '▼'} ${Math.abs(a - b)} ពីខែមុន` : '');

  return (
    <>
      <PageTitle title="របាយការណ៍ប្រចាំខែ" sub={label(cur.month || '2026-01')} actions={<Button variant="secondary" className="no-print" onClick={() => window.print()}>បោះពុម្ព</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={`ខ្ចី · ${diff(cur.loans, prev.loans)}`} value={cur.loans} />
        <Stat label="សង" value={cur.returns} tone="green" />
        <Stat label="សមាជិកថ្មី" value={cur.new_members} />
        <Stat label="ពិន័យប្រមូលបាន" value={riel(cur.fines_collected)} tone="amber" />
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 font-semibold">ចំនួនខ្ចីសៀវភៅ ១២ ខែចុងក្រោយ</h2>
        <div className="flex h-48 items-end gap-1.5">
          {rows.map((r) => (
            <div key={r.month} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-gray-600">{r.loans || ''}</span>
              <div className="w-full rounded-t bg-brand-600" style={{ height: `${(r.loans / max) * 100}%`, minHeight: r.loans ? 2 : 0 }} title={`${label(r.month)}: ${r.loans}`} />
              <span className="text-[10px] text-gray-500">{MONTHS[Number(r.month.slice(5, 7)) - 1].slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <Table head={['ខែ', 'ខ្ចី', 'សង', 'សមាជិកថ្មី', 'ពិន័យប្រមូលបាន']}>
            {[...rows].reverse().map((r) => (
              <tr key={r.month}><td className={td}>{label(r.month)}</td><td className={td}>{r.loans}</td><td className={td}>{r.returns}</td><td className={td}>{r.new_members}</td><td className={td}>{riel(r.fines_collected)}</td></tr>
            ))}
          </Table>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">ខ្ចីតាមប្រភេទ (ខែនេះ)</h2>
          {byCat.length === 0 ? <p className="text-sm text-gray-400">មិនទាន់មាន</p> : byCat.map(([k, v]) => (
            <div key={k} className="mb-2 text-sm">
              <div className="flex justify-between"><span>{k}</span><span>{v}</span></div>
              <div className="h-2 rounded bg-gray-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${(v / byCat[0][1]) * 100}%` }} /></div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
