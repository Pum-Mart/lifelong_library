'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { findOrCreate } from '@/lib/catalog';
import { errText, COPY_STATUS, fmtDate } from '@/lib/format';
import { useStaff } from '@/lib/staffContext';
import ImageUpload from './ImageUpload';
import QRImage from './QRImage';
import { Card, Field, Input, Select, Button, Alert, Table, td, inputCls } from './ui';

const empty = { title: '', isbn: '', author: '', publisher: '', category_id: '', year: '', language: 'ខ្មែរ', pages: '', price: 0, cover_url: '', description: '' };

export default function BookForm({ id }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const staff = useStaff();
  const [f, setF] = useState(empty);
  const [newCopies, setNewCopies] = useState(1);
  const [shelf, setShelf] = useState('');
  const [copies, setCopies] = useState([]);
  const [cats, setCats] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  async function loadCopies() {
    const { data } = await sb.from('book_copies').select('*').eq('book_id', id).order('barcode');
    setCopies(data || []);
  }

  useEffect(() => {
    sb.from('categories').select('*').order('name').then(({ data }) => setCats(data || []));
    sb.from('authors').select('name').order('name').then(({ data }) => setAuthors(data || []));
    sb.from('publishers').select('name').order('name').then(({ data }) => setPubs(data || []));
    if (id) {
      sb.from('books').select('*, authors(name), publishers(name)').eq('id', id).single().then(({ data }) => {
        if (data) setF({ ...empty, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])), author: data.authors?.name || '', publisher: data.publishers?.name || '' });
      });
      loadCopies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg({});
    try {
      const row = {
        title: f.title.trim(), isbn: f.isbn || null, category_id: f.category_id || null,
        year: f.year ? Number(f.year) : null, language: f.language || null, pages: f.pages ? Number(f.pages) : null,
        price: Number(f.price) || 0, cover_url: f.cover_url || null, description: f.description || null,
        author_id: await findOrCreate(sb, 'authors', f.author),
        publisher_id: await findOrCreate(sb, 'publishers', f.publisher),
      };
      if (id) {
        const { error } = await sb.from('books').update(row).eq('id', id);
        if (error) throw error;
        setMsg({ tone: 'green', text: 'បានរក្សាទុក' });
      } else {
        const { data, error } = await sb.from('books').insert(row).select('id').single();
        if (error) throw error;
        const n = Math.max(0, Number(newCopies) || 0);
        if (n) {
          const { error: e2 } = await sb.from('book_copies').insert(Array.from({ length: n }, () => ({ book_id: data.id, shelf: shelf || null })));
          if (e2) throw e2;
        }
        router.push(`/admin/books/${data.id}?created=1`);
      }
    } catch (err) {
      setMsg({ tone: 'red', text: errText(err) });
    }
    setBusy(false);
  }

  async function addCopies() {
    const n = Math.max(1, Number(newCopies) || 1);
    const { error } = await sb.from('book_copies').insert(Array.from({ length: n }, () => ({ book_id: id, shelf: shelf || null })));
    setMsg(error ? { tone: 'red', text: errText(error) } : { tone: 'green', text: `បានបន្ថែម ${n} ក្បាល` });
    loadCopies();
  }

  async function updateCopy(cid, patch) {
    const { error } = await sb.from('book_copies').update(patch).eq('id', cid);
    if (error) setMsg({ tone: 'red', text: errText(error) });
    loadCopies();
  }

  async function remove() {
    if (!confirm('លុបសៀវភៅនេះ និងច្បាប់ចម្លងទាំងអស់?')) return;
    const { error } = await sb.from('books').delete().eq('id', id);
    if (error) return setMsg({ tone: 'red', text: errText(error) + ' — អាចប្ដូរស្ថានភាពជា «ដកចេញ» ជំនួសវិញ' });
    router.push('/admin/books');
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save}>
        <Card className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="ចំណងជើង *"><Input required value={f.title} onChange={set('title')} /></Field></div>
          <Field label="អ្នកនិពន្ធ">
            <input list="authors" value={f.author} onChange={set('author')} className={inputCls} placeholder="វាយឈ្មោះ ឬជ្រើស" />
            <datalist id="authors">{authors.map((a) => <option key={a.name} value={a.name} />)}</datalist>
          </Field>
          <Field label="ប្រភេទ">
            <Select value={f.category_id} onChange={set('category_id')}>
              <option value="">— ជ្រើស —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.ddc_code ? `${c.ddc_code} · ` : ''}{c.name}</option>)}
            </Select>
          </Field>
          <Field label="អ្នកបោះពុម្ព">
            <input list="pubs" value={f.publisher} onChange={set('publisher')} className={inputCls} />
            <datalist id="pubs">{pubs.map((a) => <option key={a.name} value={a.name} />)}</datalist>
          </Field>
          <Field label="ISBN"><Input value={f.isbn} onChange={set('isbn')} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="ឆ្នាំ"><Input type="number" value={f.year} onChange={set('year')} /></Field>
            <Field label="ទំព័រ"><Input type="number" value={f.pages} onChange={set('pages')} /></Field>
            <Field label="ភាសា"><Input value={f.language} onChange={set('language')} /></Field>
          </div>
          <Field label="តម្លៃ (រៀល)" hint="ប្រើគណនាពិន័យពេលសៀវភៅបាត់"><Input type="number" min="0" step="100" value={f.price} onChange={set('price')} /></Field>
          <Field label="រូបក្រប"><ImageUpload value={f.cover_url} onChange={set('cover_url')} folder="covers" /></Field>
          <Field label="សេចក្ដីសង្ខេប"><textarea rows={3} value={f.description} onChange={set('description')} className={inputCls} /></Field>
          {!id && (
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <Field label="ចំនួនក្បាល" hint="ប្រព័ន្ធបង្កើតលេខ PLH-B ឲ្យរាល់ក្បាល"><Input type="number" min="0" value={newCopies} onChange={(e) => setNewCopies(e.target.value)} /></Field>
              <Field label="ធ្នើ"><Input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="ឧ. A-3" /></Field>
            </div>
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button disabled={busy}>{busy ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button>
            <Link href="/admin/books" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">បោះបង់</Link>
            {id && staff?.role === 'admin' && <Button type="button" variant="danger" className="ml-auto" onClick={remove}>លុប</Button>}
          </div>
          <div className="md:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>
        </Card>
      </form>

      {id && (
        <Card>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-semibold">ច្បាប់ចម្លង ({copies.length})</h2>
            <div className="flex items-end gap-2">
              <Input type="number" min="1" value={newCopies} onChange={(e) => setNewCopies(e.target.value)} className="w-20" />
              <Input placeholder="ធ្នើ" value={shelf} onChange={(e) => setShelf(e.target.value)} className="w-24" />
              <Button type="button" variant="secondary" onClick={addCopies}>+ បន្ថែមក្បាល</Button>
              <Link href={`/admin/labels?book=${id}`} className="rounded-lg px-3 py-2 text-sm text-brand-600 hover:bg-brand-50">បោះពុម្ពស្លាក</Link>
            </div>
          </div>
          <Table head={['QR', 'លេខ', 'ធ្នើ', 'ស្ថានភាព', 'ថ្ងៃទទួល']}>
            {copies.map((c) => (
              <tr key={c.id}>
                <td className={td}><QRImage value={c.barcode} size={40} /></td>
                <td className={td}>{c.barcode}</td>
                <td className={td}><input defaultValue={c.shelf || ''} onBlur={(e) => e.target.value !== (c.shelf || '') && updateCopy(c.id, { shelf: e.target.value || null })} className={`${inputCls} w-24`} /></td>
                <td className={td}>
                  {c.status === 'on_loan' ? <span className="text-sm text-blue-700">{COPY_STATUS.on_loan.label}</span> : (
                    <Select value={c.status} onChange={(e) => updateCopy(c.id, { status: e.target.value })} className="w-32">
                      {['available', 'damaged', 'lost', 'withdrawn'].map((s) => <option key={s} value={s}>{COPY_STATUS[s].label}</option>)}
                    </Select>
                  )}
                </td>
                <td className={td}>{fmtDate(c.acquired_date)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
