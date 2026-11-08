'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabaseBrowser } from '@/lib/supabase/client';
import { today, errText, COPY_STATUS, LOAN_STATUS, FINE_STATUS, FINE_TYPE, MEMBER_STATUS } from '@/lib/format';
import { PageTitle, Card, Field, Input, Button, Alert } from '@/components/ui';

const lbl = (map, v) => map[v]?.label || v;

// ទាញទិន្នន័យជាផ្នែកៗ (Supabase កំណត់ 1000 ជួរ/ដង)
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const SETS = {
  books: { label: 'សៀវភៅ (គ្រប់ក្បាល)', dated: false, run: async (sb) => (await fetchAll(() => sb.from('book_copies').select('barcode, shelf, status, acquired_date, books(title, isbn, year, price, language, authors(name), categories(name), publishers(name))').order('barcode')))
      .map((c) => ({ 'លេខ': c.barcode, 'ចំណងជើង': c.books.title, 'អ្នកនិពន្ធ': c.books.authors?.name, 'ប្រភេទ': c.books.categories?.name, 'អ្នកបោះពុម្ព': c.books.publishers?.name, 'ឆ្នាំ': c.books.year, 'ISBN': c.books.isbn, 'តម្លៃ': c.books.price, 'ធ្នើ': c.shelf, 'ស្ថានភាព': lbl(COPY_STATUS, c.status), 'ថ្ងៃទទួល': c.acquired_date })) },
  members: { label: 'សមាជិក', dated: false, run: async (sb) => (await fetchAll(() => sb.from('members').select('*, member_types(name)').order('member_code')))
      .map((m) => ({ 'លេខ': m.member_code, 'ឈ្មោះ': m.name, 'ភេទ': m.gender, 'ប្រភេទ': m.member_types?.name, 'ទូរស័ព្ទ': m.phone, 'អាសយដ្ឋាន': m.address, 'ចុះឈ្មោះ': m.joined_date, 'ផុតកំណត់': m.expiry_date, 'ស្ថានភាព': lbl(MEMBER_STATUS, m.status) })) },
  loans: { label: 'ការខ្ចី-សង', dated: true, run: async (sb, from, to) => (await fetchAll(() => sb.from('v_loans').select('*').gte('loan_date', from).lte('loan_date', to).order('loan_date')))
      .map((l) => ({ 'ថ្ងៃខ្ចី': l.loan_date, 'ត្រូវសង': l.due_date, 'ថ្ងៃសង': l.return_date, 'លេខសៀវភៅ': l.barcode, 'ចំណងជើង': l.title, 'លេខសមាជិក': l.member_code, 'សមាជិក': l.member_name, 'បន្ត': l.renew_count, 'ថ្ងៃហួស': l.days_late, 'ស្ថានភាព': lbl(LOAN_STATUS, l.loan_status) })) },
  overdue: { label: 'ហួសកំណត់ (បច្ចុប្បន្ន)', dated: false, run: async (sb) => (await fetchAll(() => sb.from('v_loans').select('*').eq('loan_status', 'overdue').order('due_date')))
      .map((l) => ({ 'សមាជិក': l.member_name, 'លេខសមាជិក': l.member_code, 'ទូរស័ព្ទ': l.member_phone, 'ចំណងជើង': l.title, 'លេខសៀវភៅ': l.barcode, 'ត្រូវសង': l.due_date, 'ថ្ងៃហួស': l.days_late, 'ពិន័យ': l.accrued_fine })) },
  fines: { label: 'ពិន័យ', dated: true, run: async (sb, from, to) => (await fetchAll(() => sb.from('fines').select('*, members(name, member_code)').gte('created_at', from).lte('created_at', `${to}T23:59:59`).order('created_at')))
      .map((f) => ({ 'ថ្ងៃ': f.created_at.slice(0, 10), 'លេខសមាជិក': f.members?.member_code, 'សមាជិក': f.members?.name, 'ប្រភេទ': FINE_TYPE[f.type], 'ចំនួន (៛)': f.amount, 'ស្ថានភាព': lbl(FINE_STATUS, f.status), 'ថ្ងៃបង់': f.paid_at?.slice(0, 10), 'មូលហេតុលើកលែង': f.waived_reason })) },
  monthly: { label: 'សង្ខេបប្រចាំខែ (១២ ខែ)', dated: false, run: async (sb) => ((await sb.from('v_monthly_stats').select('*')).data || [])
      .map((r) => ({ 'ខែ': r.month, 'ខ្ចី': r.loans, 'សង': r.returns, 'សមាជិកថ្មី': r.new_members, 'ពិន័យប្រមូលបាន (៛)': r.fines_collected })) },
};

export default function ExportPage() {
  const first = new Date(); first.setDate(1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [picked, setPicked] = useState({ books: true, members: true, loans: true, overdue: true, fines: true, monthly: true });
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setMsg({ tone: 'blue', text: 'កំពុងទាញទិន្នន័យ…' });
    try {
      const sb = supabaseBrowser();
      const wb = XLSX.utils.book_new();
      for (const [key, s] of Object.entries(SETS)) {
        if (!picked[key]) continue;
        const rows = await s.run(sb, from, to);
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'មិនមានទិន្នន័យ' }]);
        ws['!cols'] = Object.keys(rows[0] || { a: 1 }).map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(wb, ws, s.label.slice(0, 31).replace(/[\\/?*[\]:]/g, ''));
      }
      XLSX.writeFile(wb, `library-${from}_${to}.xlsx`);
      setMsg({ tone: 'green', text: 'បានទាញយកឯកសារ Excel' });
    } catch (e) {
      setMsg({ tone: 'red', text: errText(e) });
    }
    setBusy(false);
  }

  return (
    <>
      <PageTitle title="Export Excel" sub="ទិន្នន័យនីមួយៗចេញជា sheet មួយក្នុងឯកសារ .xlsx តែមួយ" />
      <Card className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ពីថ្ងៃ"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="ដល់ថ្ងៃ"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          {Object.entries(SETS).map(([k, s]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!picked[k]} onChange={(e) => setPicked({ ...picked, [k]: e.target.checked })} />
              {s.label} {s.dated && <span className="text-xs text-gray-400">(តាមចន្លោះថ្ងៃ)</span>}
            </label>
          ))}
        </div>
        <Button onClick={run} disabled={busy}>{busy ? 'កំពុងរៀបចំ…' : 'ទាញយក .xlsx'}</Button>
        <Alert tone={msg.tone}>{msg.text}</Alert>
      </Card>
    </>
  );
}
