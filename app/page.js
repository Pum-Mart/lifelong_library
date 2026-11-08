'use client';
import { useEffect, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import BookCard from '@/components/BookCard';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLibrary } from '@/lib/useLibrary';
import { inputCls, Select, Spinner, Empty } from '@/components/ui';

export default function Home() {
  const sb = supabaseBrowser();
  const lib = useLibrary();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [cats, setCats] = useState([]);
  const [books, setBooks] = useState(null);
  const [avail, setAvail] = useState({});
  const [newest, setNewest] = useState([]);
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    sb.from('categories').select('*').order('name').then(({ data }) => setCats(data || []));
    sb.from('books').select('id,title,cover_url,authors(name)').order('created_at', { ascending: false }).limit(10).then(({ data }) => setNewest(data || []));
    sb.from('v_top_books').select('*').limit(10).then(({ data }) => setPopular((data || []).map((r) => ({ ...r, id: r.book_id }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e) {
    e?.preventDefault();
    setBooks(undefined);
    let query = sb.from('books').select('id,title,cover_url,isbn,authors(name)').order('title').limit(60);
    if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,isbn.ilike.%${q.trim()}%`);
    if (cat) query = query.eq('category_id', cat);
    const { data } = await query;
    setBooks(data || []);
    const ids = (data || []).map((b) => b.id);
    if (ids.length) {
      const { data: a } = await sb.from('v_book_availability').select('*').in('book_id', ids);
      setAvail(Object.fromEntries((a || []).map((r) => [r.book_id, r])));
    }
  }

  return (
    <>
      <PublicHeader />
      <section className="bg-gradient-to-b from-brand-900 to-brand-700 pb-10 pt-6 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-2xl font-bold">ស្វែងរកសៀវភៅ</h1>
          <p className="mt-1 text-sm text-brand-100">{lib?.opening_hours && `ម៉ោងបើក៖ ${lib.opening_hours}`}</p>
          <form onSubmit={search} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ចំណងជើង ឬ ISBN…" className={`${inputCls} text-gray-900`} />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="text-gray-900 sm:w-56">
              <option value="">គ្រប់ប្រភេទ</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <button className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">ស្វែងរក</button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        {books === undefined && <Spinner />}
        {Array.isArray(books) && (
          <section>
            <h2 className="mb-3 font-bold">លទ្ធផល ({books.length})</h2>
            {books.length === 0 ? <Empty>រកមិនឃើញសៀវភៅ</Empty> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {books.map((b) => <BookCard key={b.id} book={b} available={avail[b.id]?.available ?? 0} total={avail[b.id]?.total ?? 0} />)}
              </div>
            )}
          </section>
        )}
        {popular.length > 0 && (
          <section>
            <h2 className="mb-3 font-bold">សៀវភៅពេញនិយម</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {popular.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          </section>
        )}
        <section>
          <h2 className="mb-3 font-bold">សៀវភៅថ្មីៗ</h2>
          {newest.length === 0 ? <Empty>មិនទាន់មានសៀវភៅ</Empty> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {newest.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-gray-500">{lib?.address}</footer>
    </>
  );
}
