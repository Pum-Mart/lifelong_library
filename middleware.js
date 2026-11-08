import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_PATHS = ['/admin', '/me', '/account'];
const NEEDS_SESSION = [...AUTH_PATHS, '/login', '/reset-password'];
const under = (path, list) => list.some((p) => path === p || path.startsWith(p + '/'));

// ពិនិត្យថា Supabase ត្រូវបានកំណត់ពិតប្រាកដ (មិនមែនតម្លៃគំរូ)
function configProblem() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) return 'ខ្វះ NEXT_PUBLIC_SUPABASE_URL ឬ NEXT_PUBLIC_SUPABASE_ANON_KEY';
  if (url.includes('xxxxxxxx') || anon === 'eyJ...') return 'នៅតែជាតម្លៃគំរូពី .env.example';
  if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
    return 'NEXT_PUBLIC_SUPABASE_URL មិនត្រឹមត្រូវ (ត្រូវជា https://<id>.supabase.co)';
  }
  return null;
}

function setupPage(problem) {
  const html = `<!doctype html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ត្រូវកំណត់ Supabase</title>
<style>body{font-family:system-ui,'Kantumruy Pro',sans-serif;background:#f8fafc;color:#1f2937;margin:0;padding:16px}
.c{max-width:560px;margin:48px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
h1{font-size:20px;margin:0 0 8px}.e{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:14px}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px}li{margin:6px 0;font-size:14px}</style></head>
<body><div class="c"><h1>⚙️ ប្រព័ន្ធមិនទាន់ភ្ជាប់ Supabase</h1>
<p class="e">${problem}</p>
<ol>
<li>បើក Supabase → <b>Project Settings → API</b></li>
<li>ចម្លង <code>Project URL</code>, <code>anon key</code>, <code>service_role key</code></li>
<li>លើកុំព្យូទ័រ៖ ដាក់ក្នុង <code>.env.local</code> រួចចាប់ផ្ដើម <code>npm run dev</code> ឡើងវិញ</li>
<li>លើ Vercel៖ <b>Settings → Environment Variables</b> រួច <b>Redeploy</b></li>
<li>ដំណើរការ <code>supabase/schema.sql</code>, <code>storage.sql</code>, <code>auth.sql</code> ក្នុង SQL Editor</li>
</ol></div></body></html>`;
  return new NextResponse(html, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function middleware(request) {
  const problem = configProblem();
  if (problem) return setupPage(problem);

  const path = request.nextUrl.pathname;
  let response = NextResponse.next({ request });
  if (!under(path, NEEDS_SESSION)) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    // Supabase មិនឆ្លើយ — បណ្ដោយឱ្យទំព័របង្ហាញកំហុសខ្លួនឯង
  }

  if (!user && under(path, AUTH_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}

// គ្រប់ទំព័រ (លើកលែងឯកសារ static) ដើម្បីបង្ហាញសារកំណត់ ពេល Supabase មិនទាន់ភ្ជាប់
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'] };
