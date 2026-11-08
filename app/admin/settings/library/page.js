'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { errText } from '@/lib/format';
import AdminOnly from '@/components/AdminOnly';
import ImageUpload from '@/components/ImageUpload';
import { PageTitle, Card, Field, Input, Button, Alert } from '@/components/ui';

function Library() {
  const sb = supabaseBrowser();
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { sb.from('settings').select('*').eq('id', 1).single().then(({ data }) => setF(data)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  async function save(e) {
    e.preventDefault();
    const { error } = await sb.from('settings').update({ library_name: f.library_name, address: f.address, phone: f.phone, opening_hours: f.opening_hours, logo_url: f.logo_url || null }).eq('id', 1);
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: 'បានរក្សាទុក' });
  }

  if (!f) return null;
  return (
    <>
      <PageTitle title="ព័ត៌មានបណ្ណាល័យ" sub="បង្ហាញលើទំព័រដើម កាតសមាជិក និងស្លាក" />
      <form onSubmit={save}>
        <Card className="max-w-2xl space-y-4">
          <Field label="ឈ្មោះបណ្ណាល័យ"><Input required value={f.library_name} onChange={set('library_name')} /></Field>
          <Field label="អាសយដ្ឋាន"><Input value={f.address || ''} onChange={set('address')} /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ទូរស័ព្ទ"><Input value={f.phone || ''} onChange={set('phone')} /></Field>
            <Field label="ម៉ោងបើក"><Input value={f.opening_hours || ''} onChange={set('opening_hours')} /></Field>
          </div>
          <Field label="ឡូហ្គោ"><ImageUpload value={f.logo_url} onChange={set('logo_url')} folder="logo" /></Field>
          <Button>រក្សាទុក</Button>
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </Card>
      </form>
    </>
  );
}

export default function LibraryPage() { return <AdminOnly><Library /></AdminOnly>; }
