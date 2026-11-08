'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import { supabaseBrowser } from '@/lib/supabase/client';
import { COPY_STATUS } from '@/lib/format';
import { Card, StatusBadge, Spinner, Empty } from '@/components/ui';

export default function BookDetail({ params }) {
  const sb = supabaseBrowser();
  const [book, setBook] = useState(undefined);
  const [copies, setCopies] = useState([]);

  useEffect(() => {
    sb.from('books').select('*, authors(name), categories(name, ddc_code), publishers(name)').eq('id', params.id).maybeSingle().then(({ data }) => setBook(data));
    sb.from('book_copies').select('id, barcode, shelf, status').eq('book_id', params.id).neq('status', 'withdrawn').order('barcode').then(({ data }) => setCopies(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const available = copies.filter((c) => c.status === 'available').length;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/" className="text-sm text-brand-600">← ត្រឡប់ក្រោយ</Link>
        {book === undefined ? <Spinner /> : !book ? <Empty>រកមិនឃើញសៀវភៅ</Empty> : (
          <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-brand-50">
              {book.cover_url ? <img src={book.cover_url} alt="" className="h-full w-full object-cover" /> : <span className="p-4 text-center text-brand-700">{book.title}</span>}
            </div>
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-brand-900">{book.title}</h1>
                {book.authors?.name && <p className="text-gray-600">ដោយ {book.authors.name}</p>}
              </div>
              <div className={`inline-block rounded-lg px-3 py-1 text-sm font-medium ${available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {available ? `អាចខ្ចីបាន ${available} ក្បាល ក្នុងចំណោម ${copies.length}` : 'ខ្ចីអស់ហើយ'}
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
                {[
                  ['ប្រភេទ', book.categories ? `${book.categories.name}${book.categories.ddc_code ? ` (${book.categories.ddc_code})` : ''}` : null],
                  ['អ្នកបោះពុម្ព', book.publishers?.name], ['ឆ្នាំ', book.year], ['ភាសា', book.language],
                  ['ចំនួនទំព័រ', book.pages], ['ISBN', book.isbn],
                ].filter(([, v]) => v).map(([k, v]) => (<Fragment key={k}><dt className="text-gray-500">{k}</dt><dd>{v}</dd></Fragment>))}
              </dl>
              {book.description && <p className="whitespace-pre-line text-sm leading-7">{book.description}</p>}
              <Card>
                <h2 className="mb-2 font-semibold">ច្បាប់ចម្លង</h2>
                <ul className="divide-y text-sm">
                  {copies.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2">
                      <span>{c.barcode}{c.shelf && <span className="text-gray-500"> · ធ្នើ {c.shelf}</span>}</span>
                      <StatusBadge map={COPY_STATUS} value={c.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
