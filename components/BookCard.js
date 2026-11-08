import Link from 'next/link';

export default function BookCard({ book, available, total }) {
  return (
    <Link href={`/books/${book.id}`} className="group block rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-brand-600">
      <div className="mb-2 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-brand-50">
        {book.cover_url
          ? <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
          : <span className="px-2 text-center text-sm text-brand-700">{book.title}</span>}
      </div>
      <div className="line-clamp-2 text-sm font-medium group-hover:text-brand-700">{book.title}</div>
      {book.authors?.name && <div className="text-xs text-gray-500">{book.authors.name}</div>}
      {total !== undefined && (
        <div className={`mt-1 text-xs ${available > 0 ? 'text-green-700' : 'text-red-600'}`}>
          {available > 0 ? `ទំនេរ ${available}/${total}` : 'ខ្ចីអស់'}
        </div>
      )}
    </Link>
  );
}
