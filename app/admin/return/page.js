'use client';
import { useState } from 'react';
import Scanner from '@/components/Scanner';
import { supabaseBrowser } from '@/lib/supabase/client';
import { riel, fmtDate, errText } from '@/lib/format';
import { PageTitle, Card, Button, Alert, Field, Input } from '@/components/ui';

export default function Return() {
  const sb = supabaseBrowser();
  const [loan, setLoan] = useState(null);
  const [condition, setCondition] = useState('good');
  const [damageFee, setDamageFee] = useState(0);
  const [msg, setMsg] = useState({});
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  async function onScan(code) {
    setMsg({});
    const { data } = await sb.from('v_loans').select('*').eq('barcode', code).is('return_date', null).maybeSingle();
    if (!data) return setMsg({ tone: 'red', text: `សៀវភៅ ${code} មិនមានការខ្ចីទេ` });
    setLoan(data); setCondition('good'); setDamageFee(0);
  }

  async function submit(payNow) {
    setBusy(true);
    const { data, error } = await sb.rpc('return_book', { p_barcode: loan.barcode, p_condition: condition, p_damage_fee: Number(damageFee) || 0, p_pay_now: payNow });
    setBusy(false);
    if (error) return setMsg({ tone: 'red', text: errText(error) });
    const total = data.fine + data.damage_fee;
    setLog((l) => [{ ...data, at: new Date().toLocaleTimeString(), payNow }, ...l]);
    setMsg({ tone: 'green', text: `✓ បានសង «${data.title}»${total ? ` — ពិន័យ ${riel(total)} ${payNow ? '(បានបង់)' : '(កត់ជាបំណុល)'}` : ''}` });
    setLoan(null);
  }

  const total = (loan?.accrued_fine || 0) + (condition === 'damaged' ? Number(damageFee) || 0 : 0);

  return (
    <>
      <PageTitle title="សងសៀវភៅ" sub="ស្កេនសៀវភៅ — មិនចាំបាច់ស្កេនកាតសមាជិកទេ" />
      <Card><Scanner onScan={onScan} placeholder="ស្កេនសៀវភៅ (PLH-B-…)" /></Card>
      <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>

      {loan && (
        <Card className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <div className="text-lg font-bold">{loan.title}</div>
              <div className="text-gray-500">{loan.barcode}</div>
              <div>អ្នកខ្ចី៖ <b>{loan.member_name}</b> ({loan.member_code})</div>
              <div>ថ្ងៃខ្ចី៖ {fmtDate(loan.loan_date)} · ត្រូវសង៖ {fmtDate(loan.due_date)}</div>
              {loan.days_late > 0
                ? <div className="font-semibold text-red-600">ហួសកំណត់ {loan.days_late} ថ្ងៃ — ពិន័យ {riel(loan.accrued_fine)}</div>
                : <div className="text-green-700">សងទាន់ពេល</div>}
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium">ស្ថានភាពសៀវភៅ</div>
              <div className="flex gap-2">
                {[['good', 'ល្អ'], ['damaged', 'ខូច']].map(([v, l]) => (
                  <button key={v} onClick={() => setCondition(v)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${condition === v ? 'border-brand-600 bg-brand-50 font-medium' : ''}`}>{l}</button>
                ))}
              </div>
              {condition === 'damaged' && (
                <Field label="ថ្លៃខូចខាត (រៀល)" hint="បណ្ណារក្សវាយតម្លៃ — ពាក់កណ្ដាល ឬពេញតម្លៃសៀវភៅ">
                  <Input type="number" min="0" step="500" value={damageFee} onChange={(e) => setDamageFee(e.target.value)} />
                </Field>
              )}
              <div className="rounded-lg bg-gray-50 p-3 text-sm">ពិន័យសរុប៖ <b className="text-lg">{riel(total)}</b></div>
              <div className="flex gap-2">
                {total > 0 ? (
                  <>
                    <Button className="flex-1" disabled={busy} onClick={() => submit(true)}>សង + បង់ឥឡូវ</Button>
                    <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => submit(false)}>សង (បង់ពេលក្រោយ)</Button>
                  </>
                ) : <Button className="flex-1 py-3" disabled={busy} onClick={() => submit(false)}>បញ្ជាក់ការសង</Button>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {log.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 font-semibold">បានសងក្នុងវគ្គនេះ</h2>
          <ul className="divide-y text-sm">
            {log.map((r, i) => (
              <li key={i} className="flex justify-between py-1.5">
                <span>{r.at} · {r.title} — {r.member_name}</span>
                <span>{r.fine + r.damage_fee ? riel(r.fine + r.damage_fee) : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
