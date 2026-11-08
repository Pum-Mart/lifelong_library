'use client';
import { useState } from 'react';
import { StaffCtx } from '@/lib/staffContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useLibrary } from '@/lib/useLibrary';
import { signOut } from '@/lib/authClient';
import { Spinner } from '@/components/ui';

const NAV = [
  { label: 'Dashboard', href: '/admin' },
  { group: 'ចរាចរ' },
  { label: 'ខ្ចីសៀវភៅ', href: '/admin/checkout' },
  { label: 'សងសៀវភៅ', href: '/admin/return' },
  { label: 'កំពុងខ្ចី និងហួសកំណត់', href: '/admin/loans' },
  { group: 'សៀវភៅ' },
  { label: 'បញ្ជីសៀវភៅ', href: '/admin/books' },
  { label: 'ប្រភេទ និងអ្នកនិពន្ធ', href: '/admin/catalog' },
  { group: 'សមាជិក' },
  { label: 'បញ្ជីសមាជិក', href: '/admin/members' },
  { label: 'ពិន័យ', href: '/admin/fines' },
  { group: 'QR / Barcode' },
  { label: 'ស្លាកសៀវភៅ', href: '/admin/labels' },
  { label: 'កាតសមាជិក', href: '/admin/cards' },
  { group: 'របាយការណ៍' },
  { label: 'របាយការណ៍ប្រចាំខែ', href: '/admin/reports' },
  { label: 'សៀវភៅ និងសមាជិកពេញនិយម', href: '/admin/reports/top' },
  { label: 'Export Excel', href: '/admin/reports/export' },
  { group: 'ការកំណត់', admin: true },
  { label: 'ច្បាប់ខ្ចី និងពិន័យ', href: '/admin/settings/rules', admin: true },
  { label: 'បុគ្គលិក និងតួនាទី', href: '/admin/settings/users', admin: true },
  { label: 'គណនី និងការចូលប្រព័ន្ធ', href: '/admin/settings/accounts', admin: true },
  { label: 'ព័ត៌មានបណ្ណាល័យ', href: '/admin/settings/library', admin: true },
];

export default function AdminLayout({ children }) {
  const { loading, staff, user, disabled } = useAuth();
  const lib = useLibrary();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  if (loading) return <Spinner />;
  if (!staff) {
    return (
      <div className="mx-auto mt-20 max-w-sm text-center text-sm">
        <p>{disabled ? `គណនី ${user?.email} ត្រូវបានបិទ — សូមទាក់ទងអ្នកគ្រប់គ្រង។` : `គណនី ${user?.email} មិនមែនជាបុគ្គលិកទេ។`}</p>
        <div className="mt-3 flex justify-center gap-4">
          <Link href="/" className="text-brand-600">ទៅទំព័រដើម</Link>
          <button onClick={() => signOut('local', '/login')} className="text-brand-600">ចាកចេញ</button>
        </div>
      </div>
    );
  }
  const isAdmin = staff.role === 'admin';
  const active = (href) => (href === '/admin' ? path === '/admin' : path.startsWith(href) && !(href === '/admin/reports' && path !== '/admin/reports'));

  return (
    <StaffCtx.Provider value={staff}>
      <div className="min-h-screen lg:flex">
        <aside className={`no-print fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto bg-brand-900 text-white transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="border-b border-white/10 p-4">
            <Link href="/" className="block text-sm font-bold leading-snug">{lib?.library_name || 'បណ្ណាល័យ'}</Link>
            <div className="mt-1 text-xs text-brand-100">{staff.name} · {isAdmin ? 'អ្នកគ្រប់គ្រង' : 'បណ្ណារក្ស'}</div>
          </div>
          <nav className="p-2 text-sm">
            {NAV.filter((n) => !n.admin || isAdmin).map((n, i) =>
              n.group ? (
                <div key={i} className="mt-3 px-3 pb-1 text-xs uppercase tracking-wide text-brand-100/70">{n.group}</div>
              ) : (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-1.5 ${active(n.href) ? 'bg-white/15 font-medium' : 'hover:bg-white/10'}`}>
                  {n.label}
                </Link>
              )
            )}
            <div className="mt-4 border-t border-white/10 pt-2">
              <Link href="/account" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-1.5 text-brand-100 hover:bg-white/10">គណនីខ្ញុំ / ប្ដូរពាក្យសម្ងាត់</Link>
              <button onClick={() => signOut('local', '/login?msg=out')}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-brand-100 hover:bg-white/10">ចាកចេញ</button>
            </div>
          </nav>
        </aside>
        {open && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="flex-1">
          <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-2 lg:hidden">
            <button onClick={() => setOpen(true)} className="rounded border px-2 py-1 text-sm">☰ ម៉ឺនុយ</button>
            <span className="text-sm font-medium">{lib?.library_name}</span>
          </div>
          <main className="print-area mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </StaffCtx.Provider>
  );
}
