# ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យ (Palhal Library)

Web app សម្រាប់គ្រប់គ្រងបណ្ណាល័យសហគមន៍៖ សៀវភៅ សមាជិក ខ្ចី-សងដោយ QR ពិន័យហួសកំណត់ របាយការណ៍ និង Export Excel។
បច្ចេកវិទ្យា៖ **Next.js 14 + Supabase** ដាក់លើ **Vercel**។

## ការដំឡើង (ប្រហែល ២០ នាទី)

### ១. Supabase (database + login)
1. ចូល https://supabase.com → **New project**
2. ទៅ **SQL Editor** → បិទភ្ជាប់មាតិកា `supabase/schema.sql` → **Run**
3. បន្ទាប់មកដំណើរការ `supabase/storage.sql` (កន្លែងទុករូបភាព)
   - ហើយដំណើរការ `supabase/auth.sql` (ការគ្រប់គ្រងចូល/ចេញ កំណត់ហេតុ បិទគណនី)
   - **Authentication → URL Configuration**៖ ដាក់ Site URL ជា domain របស់អ្នក ហើយបន្ថែម `https://<domain>/auth/callback` និង `http://localhost:3000/auth/callback` ក្នុង Redirect URLs (សម្រាប់តំណ «ភ្លេចពាក្យសម្ងាត់»)
4. ទៅ **Authentication → Users → Add user** → បង្កើតគណនីអ្នកគ្រប់គ្រងដំបូង (Email + ពាក្យសម្ងាត់ ហើយធីក Auto confirm)
5. ត្រឡប់ទៅ **SQL Editor** ហើយដំណើរការកូដខាងក្រោម (ប្ដូរ email)៖
   ```sql
   insert into staff (auth_user_id, name, role)
   select id, 'អ្នកគ្រប់គ្រង', 'admin' from auth.users where email = 'you@example.com';
   ```
6. **Project Settings → API** → ចម្លង `Project URL`, `anon key` និង `service_role key`

### ២. ដំណើរការលើកុំព្យូទ័រ (សាកល្បង)
```bash
npm install
cp .env.example .env.local   # បំពេញតម្លៃទាំង ៣
npm run dev                  # បើក http://localhost:3000
```

### ៣. ដាក់លើ Vercel
1. Push folder នេះទៅ GitHub
2. https://vercel.com → **Add New Project** → ជ្រើស repo
3. **Environment Variables** → បញ្ចូល `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy**

## ចាប់ផ្ដើមប្រើ
1. ចូល `/login` ជាមួយគណនីអ្នកគ្រប់គ្រង
2. **ការកំណត់ → ព័ត៌មានបណ្ណាល័យ**៖ ដាក់ឈ្មោះ ឡូហ្គោ និងម៉ោងបើក
3. **ការកំណត់ → ច្បាប់ខ្ចី និងពិន័យ**៖ ពិនិត្យចំនួនក្បាល ថ្ងៃខ្ចី អត្រាពិន័យ ហើយបន្ថែមថ្ងៃឈប់សម្រាក
4. **បញ្ជីសៀវភៅ**៖ បន្ថែមម្ដងមួយៗ ឬ **នាំចូល Excel** (ចុច «គំរូ Excel» ដើម្បីបានទម្រង់)
5. **ស្លាកសៀវភៅ**៖ បោះពុម្ពស្លាក QR ហើយបិទលើសៀវភៅ
6. **សមាជិក → សមាជិកថ្មី**៖ ចុះឈ្មោះ ថតរូប រួចបោះពុម្ពកាត
7. **ខ្ចីសៀវភៅ**៖ ស្កេនកាតសមាជិក → ស្កេនសៀវភៅ → បញ្ជាក់

ការស្កេន៖ ប្រើកាមេរ៉ាទូរស័ព្ទ ឬកុំព្យូទ័រ (ចុច 📷) ឬប្រើម៉ាស៊ីនស្កេន USB (វាយលេខ + Enter ដោយស្វ័យប្រវត្តិ)។

## ការចូល/ចេញប្រព័ន្ធ
| មុខងារ | កន្លែង |
|---|---|
| ចូលប្រព័ន្ធ (ចាក់សោ ១៥ នាទី ក្រោយខុស ៥ ដង) | `/login` |
| ភ្លេចពាក្យសម្ងាត់ → តំណតាម Email | `/forgot-password` → `/reset-password` |
| ប្ដូរពាក្យសម្ងាត់ ចាកចេញពីឧបករណ៍ផ្សេងៗ/គ្រប់ឧបករណ៍ មើលសកម្មភាពខ្លួនឯង | `/account` |
| អ្នកគ្រប់គ្រង៖ កំណត់ពាក្យសម្ងាត់ ប្ដូរ Email បិទ/បើក បណ្ដេញចេញ លុប និងកំណត់ហេតុទាំងអស់ | `/admin/settings/accounts` |

ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៨ តួ មានទាំងអក្សរ និងលេខ។ បុគ្គលិកដែលត្រូវបានបិទ បាត់សិទ្ធិភ្លាមៗ (RLS)។

## តួនាទី
| តួនាទី | ធ្វើបាន |
|---|---|
| អ្នកគ្រប់គ្រង (admin) | គ្រប់យ៉ាង រួមទាំងការកំណត់ គ្រប់គ្រងបុគ្គលិក លើកលែងពិន័យ និងលុបទិន្នន័យ |
| បណ្ណារក្ស (librarian) | សៀវភៅ សមាជិក ខ្ចី-សង ទទួលប្រាក់ពិន័យ និងរបាយការណ៍ |
| សមាជិក | មើលសៀវភៅកំពុងខ្ចី ពិន័យ កាត QR និងបន្តពេលដោយខ្លួនឯង (`/me`) |
| ភ្ញៀវ | ស្វែងរកសៀវភៅ និងមើលថាសៀវភៅនៅទំនេរឬអត់ |

## រចនាសម្ព័ន្ធកូដ
```
supabase/schema.sql      តារាង ១២, RLS, មុខងារ checkout / return_book / renew_loan / mark_lost / pay_fine / waive_fine
supabase/storage.sql     bucket "media" សម្រាប់រូបភាព
app/                     ទំព័រទាំងអស់ (សាធារណៈ, /me, /admin/...)
app/api/users/route.js   បង្កើត/លុបគណនី (ប្រើ service role key នៅ server ប៉ុណ្ណោះ)
components/              Scanner (QR), QRImage, BookForm, MemberForm, UI
lib/                     Supabase client, ទម្រង់លេខ/ថ្ងៃ, useAuth
```

ច្បាប់អាជីវកម្មទាំងអស់ (ពិនិត្យសិទ្ធិខ្ចី គណនាពិន័យ មិនរាប់ថ្ងៃឈប់សម្រាក) រត់នៅក្នុង database ដូច្នេះមិនអាចរំលងពី browser បានទេ។
