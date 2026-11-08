'use client';
import { useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { postJSON, signOut } from '@/lib/authClient';
import { useAuth } from '@/lib/useAuth';
import { Card, Field, PasswordInput, Button, Alert, Spinner } from '@/components/ui';

export default function ResetPassword() {
  const { loading, user } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setErr('ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នា');
    setBusy(true); setErr('');
    const r = await postJSON('/api/auth/password', { password: pw });
    if (!r.ok) { setErr(r.error); setBusy(false); return; }
    await signOut('local', '/login?msg=reset');
  }

  return (
    <>
      <PublicHeader />
      <main className="px-4">
        <Card className="mx-auto mt-10 max-w-sm">
          <h1 className="mb-4 text-lg font-bold">កំណត់ពាក្យសម្ងាត់ថ្មី</h1>
          {loading ? <Spinner /> : !user ? (
            <Alert>តំណផុតកំណត់ ឬមិនត្រឹមត្រូវ — សូមស្នើតំណថ្មីនៅទំព័រ «ភ្លេចពាក្យសម្ងាត់»</Alert>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm text-gray-500">គណនី៖ {user.email}</p>
              <Field label="ពាក្យសម្ងាត់ថ្មី" hint="យ៉ាងតិច ៨ តួ មានទាំងអក្សរ និងលេខ"><PasswordInput autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              <Field label="បញ្ជាក់ពាក្យសម្ងាត់ថ្មី"><PasswordInput autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
              <Alert>{err}</Alert>
              <Button className="w-full" disabled={busy}>{busy ? 'កំពុងរក្សាទុក…' : 'រក្សាទុក'}</Button>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
