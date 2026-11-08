'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PublicHeader from './PublicHeader';

export default function MemberShell({ children }) {
  const path = usePathname();
  const tab = (href, label) => (
    <Link href={href} className={`rounded-lg px-3 py-1.5 text-sm ${path === href ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 hover:bg-brand-50'}`}>{label}</Link>
  );
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex gap-2">{tab('/me', 'គណនីខ្ញុំ')}{tab('/me/history', 'ប្រវត្តិខ្ចី')}</div>
        {children}
      </main>
    </>
  );
}
