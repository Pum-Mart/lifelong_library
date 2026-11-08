'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { errText } from '@/lib/format';
import { PageTitle, Card, Input, Button, Alert } from '@/components/ui';

function ListEditor({ table, title, fields }) {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState('');

  const load = () => sb.from(table).select('*').order(fields[0].key).then(({ data }) => setRows(data || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault(); setErr('');
    const { error } = await sb.from(table).insert(draft);
    if (error) return setErr(errText(error));
    setDraft({}); load();
  }
  async function update(id, key, value) {
    const { error } = await sb.from(table).update({ [key]: value || null }).eq('id', id);
    if (error) setErr(errText(error));
  }
  async function remove(id) {
    if (!confirm('លុប?')) return;
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) return setErr(errText(error));
    load();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title} ({rows.length})</h2>
      <form onSubmit={add} className="mb-3 flex gap-2">
        {fields.map((f) => <Input key={f.key} placeholder={f.label} required={f.required} value={draft[f.key] || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />)}
        <Button>បន្ថែម</Button>
      </form>
      <Alert>{err}</Alert>
      <ul className="max-h-[480px] divide-y overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-1.5">
            {fields.map((f) => (
              <input key={f.key} defaultValue={r[f.key] || ''} onBlur={(e) => e.target.value !== (r[f.key] || '') && update(r.id, f.key, e.target.value)}
                className="min-w-0 flex-1 rounded px-2 py-1 text-sm hover:bg-gray-50 focus:bg-white focus:outline focus:outline-brand-100" />
            ))}
            <button onClick={() => remove(r.id)} className="text-xs text-red-500">លុប</button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Catalog() {
  return (
    <>
      <PageTitle title="ប្រភេទ និងអ្នកនិពន្ធ" sub="ចុចលើឈ្មោះដើម្បីកែ" />
      <div className="grid gap-4 lg:grid-cols-3">
        <ListEditor table="categories" title="ប្រភេទ" fields={[{ key: 'name', label: 'ឈ្មោះប្រភេទ', required: true }, { key: 'ddc_code', label: 'លេខ DDC' }]} />
        <ListEditor table="authors" title="អ្នកនិពន្ធ" fields={[{ key: 'name', label: 'ឈ្មោះ', required: true }, { key: 'name_en', label: 'ឡាតាំង' }]} />
        <ListEditor table="publishers" title="អ្នកបោះពុម្ព" fields={[{ key: 'name', label: 'ឈ្មោះ', required: true }]} />
      </div>
    </>
  );
}
