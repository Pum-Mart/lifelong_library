'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLibrary } from '@/lib/useLibrary';
import { fmtDate } from '@/lib/format';
import QRImage from '@/components/QRImage';
import { PageTitle, Card, Input, Button, Empty } from '@/components/ui';

function Cards() {
  const sb = supabaseBrowser();
  const lib = useLibrary();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState({});

  async function load() {
    let query = sb.from('members').select('*, member_types(name)').eq('status', 'active').order('member_code').limit(200);
    const ids = params.get('ids');
    if (ids && !q) query = query.in('id', ids.split(','));
    else if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,member_code.ilike.%${q.trim()}%`);
    else query = query.gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString());
    const { data } = await query;
    setRows(data || []);
    setPicked(Object.fromEntries((data || []).map((m) => [m.id, true])));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const selected = rows.filter((m) => picked[m.id]);

  return (
    <>
      <div className="no-print">
        <PageTitle title="បោះពុម្ពកាតសមាជិក" sub="ទំហំកាត 85.6 × 54 mm (ដូចកាតធនាគារ) — លំនាំដើម៖ សមាជិកថ្មីក្នុង ៣០ ថ្ងៃ"
          actions={<Button onClick={() => window.print()} disabled={!selected.length}>បោះពុម្ព ({selected.length})</Button>} />
        <Card className="mb-4">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
            <Input placeholder="ឈ្មោះ ឬលេខសមាជិក…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Button variant="secondary">ស្វែងរក</Button>
          </form>
        </Card>
      </div>
      {rows.length === 0 ? <Empty /> : (
        <div className="flex flex-wrap gap-3 print:gap-2">
          {rows.map((m) => (
            <div key={m.id} className={`relative ${!picked[m.id] ? 'opacity-30 print:hidden' : ''}`} style={{ breakInside: 'avoid' }}>
              <input type="checkbox" className="no-print absolute -left-1 -top-1 z-10" checked={!!picked[m.id]} onChange={(e) => setPicked({ ...picked, [m.id]: e.target.checked })} />
              <div className="flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white" style={{ width: '85.6mm', height: '54mm' }}>
                <div className="flex items-center gap-1.5 bg-brand-900 px-2 py-1 text-white">
                  {lib?.logo_url && <img src={lib.logo_url} alt="" className="h-5 w-5 rounded-full bg-white object-contain" />}
                  <div className="truncate text-[9px] font-semibold leading-tight">{lib?.library_name}</div>
                </div>
                <div className="flex flex-1 items-center gap-2 px-2">
                  {m.photo_url ? <img src={m.photo_url} alt="" className="h-[26mm] w-[20mm] rounded object-cover" /> : <div className="h-[26mm] w-[20mm] rounded bg-gray-100" />}
                  <div className="min-w-0 flex-1 text-[9px] leading-snug">
                    <div className="text-[8px] uppercase text-gray-500">កាតសមាជិកបណ្ណាល័យ</div>
                    <div className="truncate text-[12px] font-bold">{m.name}</div>
                    <div className="font-mono text-[10px] font-semibold">{m.member_code}</div>
                    <div>{m.member_types?.name}</div>
                    <div>ផុតកំណត់៖ {fmtDate(m.expiry_date)}</div>
                  </div>
                  <QRImage value={m.member_code} size={72} />
                </div>
                <div className="truncate bg-brand-50 px-2 py-0.5 text-[7px] text-gray-600">{lib?.address}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function CardsPage() { return <Suspense><Cards /></Suspense>; }
