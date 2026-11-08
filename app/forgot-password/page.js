'use client';
import { useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import { postJSON } from '@/lib/authClient';
import { Card, Field, Input, Button, Alert } from '@/components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const r = await postJSON('/api/auth/forgot', { email });
    setMsg(r.ok
      ? { tone: 'green', text: `ប្រសិនបើ ${email} មានក្នុងប្រព័ន្ធ យើងបានផ្ញើតំណកំណត់ពាក្យសម្ងាត់ថ្មីទៅហើយ។ សូមពិនិត្យប្រអប់សំបុត្រ (រួមទាំង Spam)។` }
      : { tone: 'red', text: r.error });
    setBusy(false);
  }

  return (
    <>
      <PublicHeader />
      <main className="px-4">
        <Card className="mx-auto mt-10 max-w-sm">
          <h1 className="mb-1 text-lg font-bold">ភ្លេចពាក្យសម្ងាត់</h1>
          <p className="mb-4 text-sm text-gray-500">បញ្ចូល Email របស់អ្នក យើងនឹងផ្ញើតំណដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មី។</p>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Alert tone={msg.tone}>{msg.text}</Alert>
            <Button className="w-full" disabled={busy}>{busy ? 'កំពុងផ្ញើ…' : 'ផ្ញើតំណ'}</Button>
          </form>
          <p className="mt-4 text-xs text-gray-500">គ្មាន Email? សូមស្នើបណ្ណារក្ស ឬអ្នកគ្រប់គ្រងឱ្យកំណត់ពាក្យសម្ងាត់ថ្មីឱ្យ។</p>
          <Link href="/login" className="mt-3 inline-block text-sm text-brand-600 hover:underline">← ត្រឡប់ទៅចូលប្រព័ន្ធ</Link>
        </Card>
      </main>
    </>
  );
}
