'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLibrary } from '@/lib/useLibrary';
import QRImage from '@/components/QRImage';
import { PageTitle, Card, Input, Select, Button, Empty } from '@/components/ui';

function Labels() {
  const sb = supabaseBrowser();
  const lib = useLibrary();
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get('book') ? 'book' : 'recent');
  const [q, setQ] = useState('');
  const [days, setDays] = useState(7);
  const [copies, setCopies] = useState([]);
  const [picked, setPicked] = useState({});
  const [perRow, setPerRow] = useState(4);

  async function load() {
    let query = sb.from('book_copies').select('id, barcode, shelf, created_at, books!inner(id, title)').neq('status', 'withdrawn').order('barcode').limit(400);
    if (mode === 'book' && params.get('book')) query = query.eq('book_id', params.get('book'));
    else if (mode === 'recent') query = query.gte('created_at', new Date(Date.now() - days * 864e5).toISOString());
    else if (q.trim()) query = query.or(`barcode.ilike.%${q.trim()}%`).limit(200);
    if (mode === 'search' && q.trim() && !q.toUpperCase().startsWith('PLH')) {
      query = sb.from('book_copies').select('id, barcode, shelf, created_at, books!inner(id, title)').ilike('books.title', `%${q.trim()}%`).neq('status', 'withdrawn').order('barcode').limit(200);
    }
    const { data } = await query;
    setCopies(data || []);
    setPicked(Object.fromEntries((data || []).map((c) => [c.id, true])));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [mode, days]);

  const selected = copies.filter((c) => picked[c.id]);

  return (
    <>
      <div className="no-print">
        <PageTitle title="បោះពុម្ពស្លាក QR សៀវភៅ" sub="បិទស្លាកលើខ្នងសៀវភៅ ឬក្រោយក្រប" actions={<Button onClick={() => window.print()} disabled={!selected.length}>បោះពុម្ព ({selected.length})</Button>} />
        <Card className="mb-4 flex flex-wrap items-end gap-2">
          <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-48">
            <option value="recent">បន្ថែមថ្មីៗ</option>
            {params.get('book') && <option value="book">សៀវភៅដែលបានជ្រើស</option>}
            <option value="search">ស្វែងរក</option>
          </Select>
          {mode === 'recent' && <><Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="w-20" /><span className="pb-2 text-sm">ថ្ងៃចុងក្រោយ</span></>}
          {mode === 'search' && <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2"><Input placeholder="ចំណងជើង ឬលេខ PLH-B…" value={q} onChange={(e) => setQ(e.target.value)} /><Button variant="secondary">ស្វែងរក</Button></form>}
          <span className="ml-auto pb-2 text-sm">ស្លាកក្នុងមួយជួរ</span>
          <Select value={perRow} onChange={(e) => setPerRow(Number(e.target.value))} className="w-20">{[3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select>
        </Card>
        {copies.length > 0 && (
          <div className="mb-3 flex gap-3 text-sm">
            <button className="text-brand-600" onClick={() => setPicked(Object.fromEntries(copies.map((c) => [c.id, true])))}>ជ្រើសទាំងអស់</button>
            <button className="text-brand-600" onClick={() => setPicked({})}>មិនជ្រើសទាំងអស់</button>
          </div>
        )}
      </div>
      {copies.length === 0 ? <Empty>មិនមានសៀវភៅ</Empty> : (
        <div className="grid gap-2 bg-white print:gap-0" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
          {copies.map((c) => (
            <label key={c.id} className={`relative flex cursor-pointer items-center gap-2 border border-dashed border-gray-300 p-2 ${!picked[c.id] ? 'opacity-30 print:hidden' : ''}`} style={{ breakInside: 'avoid' }}>
              <input type="checkbox" className="no-print absolute right-1 top-1" checked={!!picked[c.id]} onChange={(e) => setPicked({ ...picked, [c.id]: e.target.checked })} />
              <QRImage value={c.barcode} size={64} />
              <div className="min-w-0 text-[10px] leading-tight">
                <div className="truncate font-semibold">{lib?.library_name?.slice(0, 30)}</div>
                <div className="line-clamp-2">{c.books.title}</div>
                <div className="mt-0.5 font-mono text-[11px] font-bold">{c.barcode}</div>
                {c.shelf && <div>ធ្នើ {c.shelf}</div>}
              </div>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

export default function LabelsPage() { return <Suspense><Labels /></Suspense>; }
