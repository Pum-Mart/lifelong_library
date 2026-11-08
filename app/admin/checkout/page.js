'use client';
import { useState } from 'react';
import Scanner from '@/components/Scanner';
import { supabaseBrowser } from '@/lib/supabase/client';
import { riel, fmtDate, errText } from '@/lib/format';
import { PageTitle, Card, Button, Alert, Table, td } from '@/components/ui';

export default function Checkout() {
  const sb = supabaseBrowser();
  const [member, setMember] = useState(null);
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState({});
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  function reset() { setMember(null); setInfo(null); setItems([]); setMsg({}); }

  async function scanMember(code) {
    setDone(null); setMsg({});
    const { data: m } = await sb.from('members').select('*, member_types(*)').eq('member_code', code).maybeSingle();
    if (!m) return setMsg({ tone: 'red', text: `រកមិនឃើញសមាជិក ${code}` });
    const { data: st } = await sb.from('v_member_status').select('*').eq('member_id', m.id).maybeSingle();
    const { data: settings } = await sb.from('settings').select('max_unpaid_fine').eq('id', 1).single();
    const problems = [];
    if (m.status !== 'active') problems.push('សមាជិកមិនសកម្ម');
    if (m.expiry_date < new Date().toISOString().slice(0, 10)) problems.push(`កាតផុតកំណត់ ${fmtDate(m.expiry_date)}`);
    if (st.overdue_loans > 0) problems.push(`មានសៀវភៅហួសកំណត់ ${st.overdue_loans} ក្បាល`);
    if (st.unpaid_fines > settings.max_unpaid_fine) problems.push(`ពិន័យមិនទាន់បង់ ${riel(st.unpaid_fines)}`);
    if (st.open_loans >= m.member_types.max_books) problems.push(`ខ្ចីពេញចំនួន ${m.member_types.max_books} ក្បាលហើយ`);
    setMember(m); setInfo({ ...st, problems });
  }

  async function scanBook(code) {
    setMsg({});
    if (items.some((i) => i.barcode === code)) return;
    if (info.open_loans + items.length >= member.member_types.max_books)
      return setMsg({ tone: 'red', text: `ខ្ចីបានច្រើនបំផុត ${member.member_types.max_books} ក្បាល` });
    const { data: c } = await sb.from('book_copies').select('barcode, status, books(title)').eq('barcode', code).maybeSingle();
    if (!c) return setMsg({ tone: 'red', text: `រកមិនឃើញសៀវភៅ ${code}` });
    if (c.status !== 'available') return setMsg({ tone: 'red', text: `«${c.books.title}» មិននៅទំនេរទេ` });
    setItems((x) => [...x, { barcode: c.barcode, title: c.books.title }]);
  }

  function onScan(code) {
    // ស្គាល់ដោយខ្លួនឯង៖ PLH-M = សមាជិក, ផ្សេងពីនេះ = សៀវភៅ
    if (code.startsWith('PLH-M-') || !member) return scanMember(code);
    return scanBook(code);
  }

  async function confirm() {
    setBusy(true);
    const { data, error } = await sb.rpc('checkout', { p_member_code: member.member_code, p_barcodes: items.map((i) => i.barcode) });
    setBusy(false);
    if (error) return setMsg({ tone: 'red', text: errText(error) });
    setDone({ ...data, items, member });
    reset();
  }

  return (
    <>
      <PageTitle title="ខ្ចីសៀវភៅ" sub="១. ស្កេនកាតសមាជិក → ២. ស្កេនសៀវភៅ → ៣. បញ្ជាក់" />
      <Card>
        <Scanner onScan={onScan} placeholder={member ? 'ស្កេនសៀវភៅ (PLH-B-…)' : 'ស្កេនកាតសមាជិក (PLH-M-…)'} />
      </Card>
      <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>

      {done && (
        <Card className="mt-4 border-green-300 bg-green-50">
          <h2 className="font-semibold text-green-800">✓ ខ្ចីបានជោគជ័យ — {done.member_name}</h2>
          <ul className="mt-1 list-disc pl-5 text-sm">{done.items.map((i) => <li key={i.barcode}>{i.title}</li>)}</ul>
          <p className="mt-2 text-lg font-bold">ត្រូវសងមុនថ្ងៃ {fmtDate(done.due_date)}</p>
          <Button variant="secondary" className="no-print mt-2" onClick={() => window.print()}>បោះពុម្ពបង្កាន់ដៃ</Button>
        </Card>
      )}

      {member && (
        <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
          <Card>
            <div className="flex gap-3">
              {member.photo_url ? <img src={member.photo_url} alt="" className="h-20 w-16 rounded object-cover" /> : <div className="h-20 w-16 rounded bg-gray-100" />}
              <div className="text-sm">
                <div className="font-bold">{member.name}</div>
                <div className="text-gray-500">{member.member_code}</div>
                <div className="text-gray-500">{member.member_types.name}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div>កំពុងខ្ចី៖ <b>{info.open_loans}</b> / {member.member_types.max_books}</div>
              <div>ពិន័យ៖ <b>{riel(info.unpaid_fines)}</b></div>
              <div>រយៈពេលខ្ចី៖ {member.member_types.loan_days} ថ្ងៃ</div>
            </div>
            {info.problems.length > 0 && <div className="mt-3"><Alert>{info.problems.map((p) => <div key={p}>⚠ {p}</div>)}</Alert></div>}
            <Button variant="ghost" className="mt-3" onClick={reset}>ប្ដូរសមាជិក</Button>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">សៀវភៅដែលនឹងខ្ចី ({items.length})</h2>
            {items.length === 0 ? <p className="text-sm text-gray-400">ស្កេនសៀវភៅដើម្បីបន្ថែម</p> : (
              <Table head={['លេខ', 'ចំណងជើង', '']}>
                {items.map((i) => (
                  <tr key={i.barcode}>
                    <td className={td}>{i.barcode}</td><td className={td}>{i.title}</td>
                    <td className={td}><button className="text-xs text-red-600" onClick={() => setItems((x) => x.filter((y) => y.barcode !== i.barcode))}>ដកចេញ</button></td>
                  </tr>
                ))}
              </Table>
            )}
            <Button className="mt-4 w-full py-3 text-base" disabled={!items.length || info.problems.some((p) => !p.startsWith('ខ្ចីពេញ')) || busy} onClick={confirm}>
              {busy ? 'កំពុងរក្សាទុក…' : 'បញ្ជាក់ការខ្ចី'}
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
