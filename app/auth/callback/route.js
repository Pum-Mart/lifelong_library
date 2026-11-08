import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/authServer';

// តំណពី Email (កំណត់ពាក្យសម្ងាត់ថ្មី) → ប្ដូរ code ជា session
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'), '/account');

  if (code) {
    const { error } = await supabaseServer().auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(new URL(next, url.origin));
      if (next === '/reset-password') {
        // អនុញ្ញាតប្ដូរពាក្យសម្ងាត់ដោយមិនបាច់ពាក្យចាស់ ក្នុងរយៈពេល ១៥ នាទី
        res.cookies.set('pw_recovery', '1', { httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 900, path: '/' });
      }
      return res;
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
