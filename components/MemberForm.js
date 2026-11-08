'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { errText, MEMBER_STATUS } from '@/lib/format';
import ImageUpload from './ImageUpload';
import { Card, Field, Input, Select, Button, Alert } from './ui';

export default function MemberForm({ member, onSaved }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [years, setYears] = useState(1);
  const [f, setF] = useState(() => member || { name: '', gender: '', phone: '', type_id: '', address: '', photo_url: '', status: 'active' });
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  useEffect(() => {
    sb.from('member_types').select('*').order('id').then(({ data }) => {
      setTypes(data || []);
      if (!member && data?.[0]) setF((x) => ({ ...x, type_id: x.type_id || data[0].id }));
    });
    sb.from('settings').select('card_valid_years').eq('id', 1).single().then(({ data }) => data && setYears(data.card_valid_years));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg({});
    const row = {
      name: f.name.trim(), gender: f.gender || null, phone: f.phone || null, type_id: Number(f.type_id),
      address: f.address || null, photo_url: f.photo_url || null, status: f.status,
    };
    if (member) {
      row.expiry_date = f.expiry_date;
      const { error } = await sb.from('members').update(row).eq('id', member.id);
      setBusy(false);
      if (error) return setMsg({ tone: 'red', text: errText(error) });
      setMsg({ tone: 'green', text: 'បានរក្សាទុក' });
      onSaved?.();
    } else {
      const exp = new Date(); exp.setFullYear(exp.getFullYear() + years);
      row.expiry_date = exp.toISOString().slice(0, 10);
      const { data, error } = await sb.from('members').insert(row).select('id').single();
      setBusy(false);
      if (error) return setMsg({ tone: 'red', text: errText(error) });
      router.push(`/admin/members/${data.id}`);
    }
  }

  return (
    <form onSubmit={save}>
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="ឈ្មោះ *"><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="ប្រភេទសមាជិក *">
          <Select required value={f.type_id} onChange={set('type_id')}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="ភេទ">
          <Select value={f.gender || ''} onChange={set('gender')}><option value="">—</option><option>ប្រុស</option><option>ស្រី</option></Select>
        </Field>
        <Field label="លេខទូរស័ព្ទ"><Input type="tel" value={f.phone || ''} onChange={set('phone')} /></Field>
        <div className="md:col-span-2"><Field label="អាសយដ្ឋាន"><Input value={f.address || ''} onChange={set('address')} /></Field></div>
        <Field label="រូបថត"><ImageUpload value={f.photo_url} onChange={set('photo_url')} folder="members" label="ថតរូប / ជ្រើស" /></Field>
        {member && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="ស្ថានភាព">
              <Select value={f.status} onChange={set('status')}>{Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
            </Field>
            <Field label="ផុតកំណត់"><Input type="date" value={f.expiry_date} onChange={set('expiry_date')} /></Field>
          </div>
        )}
        <div className="flex items-center gap-3 md:col-span-2">
          <Button disabled={busy}>{busy ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button>
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      </Card>
    </form>
  );
}
