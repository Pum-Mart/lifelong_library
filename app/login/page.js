'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useAuth } from '@/lib/useAuth';
import { postJSON, signOut } from '@/lib/authClient';
import { Card, Field, Input, PasswordInput, Button, Alert, Spinner } from '@/components/ui';

const NOTICE = {
  link: { tone: 'red', text: 'តំណមិនត្រឹមត្រូវ ឬផុតកំណត់ — សូមស្នើម្ដងទៀត' },
  reset: { tone: 'green', text: 'បានកំណត់ពាក្យសម្ងាត់ថ្មី — សូមចូលប្រព័ន្ធ' },
  out: { tone: 'green', text: 'អ្នកបានចាកចេញដោយជោគជ័យ' },
};

function LoginForm() {
  const params = useSearchParams();
  const { loading, user, staff, member } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const notice = NOTICE[params.get('error') || params.get('msg')];

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await postJSON('/api/auth/login', { email, password, next: params.get('next') });
    if (!r.ok) { setErr(r.error || 'មានបញ្ហា សូមព្យាយាមម្ដងទៀត'); setBusy(false); return; }
    location.href = r.redirect; // ផ្ទុកឡើងវិញពេញលេញ ដើម្បីឱ្យ session ថ្មីមានប្រសិទ្ធភាពគ្រប់កន្លែង
  }

  if (loading) return <Spinner />;

  if (user) {
    const home = staff ? '/admin' : member ? '/me' : '/account';
    return (
      <Card className="mx-auto mt-10 max-w-sm text-center">
        <p className="text-sm">អ្នកបានចូលប្រព័ន្ធរួចហើយជា</p>
        <p className="mt-1 font-semibold">{user.email}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => (location.href = params.get('next') || home)}>បន្ត</Button>
          <Button variant="secondary" onClick={() => signOut('local', '/login')}>ចូលគណនីផ្សេង</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-4 text-lg font-bold">ចូលប្រព័ន្ធ</h1>
      {notice && <div className="mb-3"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email"><Input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="ពាក្យសម្ងាត់"><PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="text-right"><Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">ភ្លេចពាក្យសម្ងាត់?</Link></div>
        <Alert>{err}</Alert>
        <Button className="w-full" disabled={busy}>{busy ? 'កំពុងចូល…' : 'ចូល'}</Button>
      </form>
      <p className="mt-4 text-xs text-gray-500">សមាជិកដែលមិនទាន់មានគណនី សូមសួរបណ្ណារក្ស។</p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <>
      <PublicHeader />
      <main className="px-4"><Suspense><LoginForm /></Suspense></main>
    </>
  );
}
