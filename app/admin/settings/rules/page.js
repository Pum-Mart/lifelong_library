'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { errText, fmtDate } from '@/lib/format';
import AdminOnly from '@/components/AdminOnly';
import { PageTitle, Card, Input, Button, Alert, Field, Table, td } from '@/components/ui';

const COLS = [
  ['name', 'ប្រភេទសមាជិក', 'text'], ['max_books', 'ខ្ចីច្រើនបំផុត (ក្បាល)', 'number'], ['loan_days', 'រយៈពេលខ្ចី (ថ្ងៃ)', 'number'],
  ['max_renews', 'បន្តបាន (ដង)', 'number'], ['fine_per_day', 'ពិន័យ (៛/ថ្ងៃ/ក្បាល)', 'number'],
];

function Rules() {
  const sb = supabaseBrowser();
  const [types, setTypes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [hol, setHol] = useState({ date: '', name: '' });
  const [msg, setMsg] = useState({});

  async function load() {
    const [t, s, h] = await Promise.all([
      sb.from('member_types').select('*').order('id'),
      sb.from('settings').select('*').eq('id', 1).single(),
      sb.from('holidays').select('*').gte('date', `${new Date().getFullYear()}-01-01`).order('date'),
    ]);
    setTypes(t.data || []); setSettings(s.data); setHolidays(h.data || []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const edit = (i, k, v) => setTypes((x) => x.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  async function saveTypes() {
    for (const t of types) {
      const row = { name: t.name, max_books: +t.max_books, loan_days: +t.loan_days, max_renews: +t.max_renews, fine_per_day: +t.fine_per_day };
      const { error } = t.id ? await sb.from('member_types').update(row).eq('id', t.id) : await sb.from('member_types').insert(row);
      if (error) return setMsg({ tone: 'red', text: errText(error) });
    }
    const { error } = await sb.from('settings').update({ max_unpaid_fine: +settings.max_unpaid_fine, lost_fee: +settings.lost_fee, card_valid_years: +settings.card_valid_years }).eq('id', 1);
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: 'បានរក្សាទុកច្បាប់ថ្មី — អនុវត្តចំពោះការខ្ចីបន្ទាប់' });
    load();
  }
  async function addHoliday(e) {
    e.preventDefault();
    const { error } = await sb.from('holidays').insert(hol);
    if (error) return setMsg({ tone: 'red', text: errText(error) });
    setHol({ date: '', name: '' }); load();
  }
  async function delHoliday(id) { await sb.from('holidays').delete().eq('id', id); load(); }

  return (
    <>
      <PageTitle title="ច្បាប់ខ្ចី និងពិន័យ" />
      <Alert tone={msg.tone}>{msg.text}</Alert>
      <Card className="mt-3">
        <Table head={COLS.map((c) => c[1])}>
          {types.map((t, i) => (
            <tr key={t.id || `n${i}`}>{COLS.map(([k, , type]) => <td key={k} className={td}><Input type={type} min="0" value={t[k]} onChange={(e) => edit(i, k, e.target.value)} /></td>)}</tr>
          ))}
        </Table>
        <Button variant="ghost" className="mt-2" onClick={() => setTypes([...types, { name: '', max_books: 3, loan_days: 14, max_renews: 1, fine_per_day: 500 }])}>+ ប្រភេទថ្មី</Button>
        {settings && (
          <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3">
            <Field label="ពិន័យមិនទាន់បង់អតិបរមា (៛)" hint="លើសនេះ មិនឲ្យខ្ចី"><Input type="number" value={settings.max_unpaid_fine} onChange={(e) => setSettings({ ...settings, max_unpaid_fine: e.target.value })} /></Field>
            <Field label="ថ្លៃរៀបចំ សៀវភៅបាត់ (៛)" hint="បូកលើតម្លៃសៀវភៅ"><Input type="number" value={settings.lost_fee} onChange={(e) => setSettings({ ...settings, lost_fee: e.target.value })} /></Field>
            <Field label="សុពលភាពកាត (ឆ្នាំ)"><Input type="number" min="1" value={settings.card_valid_years} onChange={(e) => setSettings({ ...settings, card_valid_years: e.target.value })} /></Field>
          </div>
        )}
        <Button className="mt-4" onClick={saveTypes}>រក្សាទុក</Button>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-1 font-semibold">ថ្ងៃឈប់សម្រាក</h2>
        <p className="mb-3 text-sm text-gray-500">មិនគិតពិន័យ ហើយថ្ងៃសងនឹងរំកិលទៅថ្ងៃធ្វើការបន្ទាប់</p>
        <form onSubmit={addHoliday} className="mb-3 flex flex-wrap gap-2">
          <Input type="date" required value={hol.date} onChange={(e) => setHol({ ...hol, date: e.target.value })} className="w-44" />
          <Input required placeholder="ឈ្មោះ ឧ. ចូលឆ្នាំខ្មែរ" value={hol.name} onChange={(e) => setHol({ ...hol, name: e.target.value })} className="max-w-xs" />
          <Button variant="secondary">បន្ថែម</Button>
        </form>
        <ul className="divide-y text-sm">
          {holidays.map((h) => (
            <li key={h.id} className="flex justify-between py-1.5"><span>{fmtDate(h.date)} — {h.name}</span><button onClick={() => delHoliday(h.id)} className="text-xs text-red-500">លុប</button></li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export default function RulesPage() { return <AdminOnly><Rules /></AdminOnly>; }
