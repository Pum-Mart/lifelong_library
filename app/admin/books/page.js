'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabaseBrowser } from '@/lib/supabase/client';
import { findOrCreate } from '@/lib/catalog';
import { riel, errText } from '@/lib/format';
import { PageTitle, Card, Table, td, Input, Select, Button, LinkButton, Alert, Spinner, Empty } from '@/components/ui';

const PAGE = 50;

export default function Books() {
  const sb = supabaseBrowser();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [cats, setCats] = useState([]);
  const [rows, setRows] = useState(null);
  const [avail, setAvail] = useState({});
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState({});

  async function load(p = page) {
    setRows(null);
    let query = sb.from('books').select('id,title,isbn,price,year,authors(name),categories(name)', { count: 'exact' }).order('title').range(p * PAGE, p * PAGE + PAGE - 1);
    if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,isbn.ilike.%${q.trim()}%`);
    if (cat) query = query.eq('category_id', cat);
    const { data, count: c } = await query;
    setRows(data || []); setCount(c || 0);
    const ids = (data || []).map((b) => b.id);
    if (ids.length) {
      const { data: a } = await sb.from('v_book_availability').select('*').in('book_id', ids);
      setAvail(Object.fromEntries((a || []).map((r) => [r.book_id, r])));
    }
  }

  useEffect(() => {
    sb.from('categories').select('*').order('name').then(({ data }) => setCats(data || []));
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  // នាំចូលពី Excel: ជួរឈរ ចំណងជើង | អ្នកនិពន្ធ | ប្រភេទ | ISBN | ឆ្នាំ | តម្លៃ | ចំនួនក្បាល | ធ្នើ
  async function importFile(file) {
    if (!file) return;
    setMsg({ tone: 'blue', text: 'កំពុងនាំចូល…' });
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const list = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));
      let ok = 0;
      for (const r of list) {
        const title = String(r['ចំណងជើង'] || r.title || '').trim();
        if (!title) continue;
        const catName = String(r['ប្រភេទ'] || r.category || '').trim();
        const { data: b, error } = await sb.from('books').insert({
          title,
          author_id: await findOrCreate(sb, 'authors', String(r['អ្នកនិពន្ធ'] || r.author || '')),
          category_id: catMap[catName] || null,
          isbn: String(r.ISBN || r.isbn || '') || null,
          year: Number(r['ឆ្នាំ'] || r.year) || null,
          price: Number(r['តម្លៃ'] || r.price) || 0,
        }).select('id').single();
        if (error) throw error;
        const n = Number(r['ចំនួនក្បាល'] || r.copies) || 1;
        await sb.from('book_copies').insert(Array.from({ length: n }, () => ({ book_id: b.id, shelf: String(r['ធ្នើ'] || r.shelf || '') || null })));
        ok++;
      }
      setMsg({ tone: 'green', text: `បាននាំចូល ${ok} ចំណងជើង` });
      load(0);
    } catch (e) {
      setMsg({ tone: 'red', text: errText(e) });
    }
  }

  function template() {
    const ws = XLSX.utils.aoa_to_sheet([['ចំណងជើង', 'អ្នកនិពន្ធ', 'ប្រភេទ', 'ISBN', 'ឆ្នាំ', 'តម្លៃ', 'ចំនួនក្បាល', 'ធ្នើ'], ['ឧទាហរណ៍៖ ផ្កាស្រពោន', 'នូ ហាច', 'អក្សរសាស្ត្រ', '', 1949, 15000, 2, 'B-1']]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'books');
    XLSX.writeFile(wb, 'books-template.xlsx');
  }

  return (
    <>
      <PageTitle title="បញ្ជីសៀវភៅ" sub={`សរុប ${count} ចំណងជើង`}
        actions={<>
          <Button variant="ghost" onClick={template}>គំរូ Excel</Button>
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            នាំចូល Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          <LinkButton href="/admin/books/new">+ បន្ថែមសៀវភៅ</LinkButton>
        </>} />
      <Alert tone={msg.tone}>{msg.text}</Alert>
      <Card className="mt-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(0); load(0); }} className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="ចំណងជើង ឬ ISBN…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="max-w-[200px]">
            <option value="">គ្រប់ប្រភេទ</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button variant="secondary">ស្វែងរក</Button>
        </form>
        {!rows ? <Spinner /> : rows.length === 0 ? <Empty /> : (
          <Table head={['ចំណងជើង', 'អ្នកនិពន្ធ', 'ប្រភេទ', 'ឆ្នាំ', 'តម្លៃ', 'ទំនេរ/សរុប']}>
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className={td}><Link href={`/admin/books/${b.id}`} className="font-medium text-brand-700 hover:underline">{b.title}</Link></td>
                <td className={td}>{b.authors?.name || '—'}</td>
                <td className={td}>{b.categories?.name || '—'}</td>
                <td className={td}>{b.year || '—'}</td>
                <td className={td}>{riel(b.price)}</td>
                <td className={td}>{avail[b.id]?.available ?? 0}/{avail[b.id]?.total ?? 0}</td>
              </tr>
            ))}
          </Table>
        )}
        {count > PAGE && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <Button variant="secondary" disabled={page === 0} onClick={() => { setPage(page - 1); load(page - 1); }}>← មុន</Button>
            <span>ទំព័រ {page + 1} / {Math.ceil(count / PAGE)}</span>
            <Button variant="secondary" disabled={(page + 1) * PAGE >= count} onClick={() => { setPage(page + 1); load(page + 1); }}>បន្ទាប់ →</Button>
          </div>
        )}
      </Card>
    </>
  );
}
