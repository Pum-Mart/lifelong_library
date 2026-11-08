'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useLibrary } from '@/lib/useLibrary';
import { signOut } from '@/lib/authClient';

export default function PublicHeader() {
  const { user, staff, member } = useAuth();
  const lib = useLibrary();
  return (
    <header className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          {lib?.logo_url && <img src={lib.logo_url} alt="" className="h-9 w-9 rounded-full bg-white object-contain" />}
          <span className="leading-tight">{lib?.library_name || 'បណ្ណាល័យ'}</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {staff && <Link href="/admin" className="hover:underline">ផ្នែកគ្រប់គ្រង</Link>}
          {member && <Link href="/me" className="hover:underline">គណនីខ្ញុំ</Link>}
          {user && <Link href="/account" className="hover:underline" title={user.email}>គណនី</Link>}
          {user
            ? <button onClick={() => signOut('local', '/login?msg=out')} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">ចាកចេញ</button>
            : <Link href="/login" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">ចូលប្រព័ន្ធ</Link>}
        </nav>
      </div>
    </header>
  );
}
