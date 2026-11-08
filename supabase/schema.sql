-- =====================================================================
-- ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យ — Database schema (Supabase / PostgreSQL)
-- ដំណើរការឯកសារនេះម្ដងក្នុង Supabase → SQL Editor
-- =====================================================================

-- ---------- ១. តារាង ----------

create table if not exists settings (
  id               int primary key default 1 check (id = 1),
  library_name     text not null default 'បណ្ណាល័យមជ្ឈមណ្ឌលសិក្សាពេញមួយជីវិតប៉ាលហាល',
  address          text default 'ភូមិប៉ាលហាល សង្កាត់ប៉ាលហាល ក្រុងព្រះវិហារ ខេត្តព្រះវិហារ',
  phone            text,
  opening_hours    text default 'ច័ន្ទ–សៅរ៍ ៨:០០–១៧:០០',
  logo_url         text,
  max_unpaid_fine  int not null default 5000,   -- លើសនេះ មិនឲ្យខ្ចី (រៀល)
  lost_fee         int not null default 2000,   -- ថ្លៃរៀបចំ ពេលសៀវភៅបាត់ (រៀល)
  card_valid_years int not null default 1
);

create table if not exists member_types (
  id           serial primary key,
  name         text not null unique,
  max_books    int not null default 3,
  loan_days    int not null default 14,
  max_renews   int not null default 1,
  fine_per_day int not null default 500
);

create table if not exists categories (
  id       serial primary key,
  name     text not null unique,
  ddc_code text
);

create table if not exists authors (
  id      serial primary key,
  name    text not null,
  name_en text
);

create table if not exists publishers (
  id   serial primary key,
  name text not null unique
);

create table if not exists books (
  id           bigserial primary key,
  title        text not null,
  isbn         text,
  author_id    int references authors(id) on delete set null,
  category_id  int references categories(id) on delete set null,
  publisher_id int references publishers(id) on delete set null,
  year         int,
  language     text default 'ខ្មែរ',
  pages        int,
  price        int not null default 0,          -- តម្លៃសៀវភៅ (រៀល)
  cover_url    text,
  description  text,
  created_at   timestamptz not null default now()
);
create index if not exists books_title_idx on books using gin (to_tsvector('simple', title));

create sequence if not exists copy_seq;
create table if not exists book_copies (
  id            bigserial primary key,
  book_id       bigint not null references books(id) on delete cascade,
  barcode       text not null unique default ('PLH-B-' || lpad(nextval('copy_seq')::text, 6, '0')),
  shelf         text,
  status        text not null default 'available'
                check (status in ('available','on_loan','lost','damaged','withdrawn')),
  acquired_date date not null default current_date,
  created_at    timestamptz not null default now()
);

create sequence if not exists member_seq;
create table if not exists members (
  id           bigserial primary key,
  member_code  text not null unique default ('PLH-M-' || lpad(nextval('member_seq')::text, 4, '0')),
  name         text not null,
  gender       text check (gender in ('ប្រុស','ស្រី')),
  phone        text,
  type_id      int not null references member_types(id),
  address      text,
  photo_url    text,
  joined_date  date not null default current_date,
  expiry_date  date not null default (current_date + interval '1 year')::date,
  status       text not null default 'active' check (status in ('active','suspended','inactive')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists staff (
  id           bigserial primary key,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name         text not null,
  role         text not null default 'librarian' check (role in ('admin','librarian')),
  created_at   timestamptz not null default now()
);

create table if not exists holidays (
  id   serial primary key,
  date date not null unique,
  name text not null
);

create table if not exists loans (
  id               bigserial primary key,
  copy_id          bigint not null references book_copies(id),
  member_id        bigint not null references members(id),
  loan_date        date not null default current_date,
  due_date         date not null,
  return_date      date,
  renew_count      int not null default 0,
  staff_id         bigint references staff(id),
  return_condition text check (return_condition in ('good','damaged','lost')),
  created_at       timestamptz not null default now()
);
-- សៀវភៅមួយក្បាល មិនអាចមានការខ្ចីបើកពីរក្នុងពេលតែមួយ
create unique index if not exists one_open_loan_per_copy on loans(copy_id) where return_date is null;
create index if not exists loans_member_idx on loans(member_id);

create table if not exists fines (
  id            bigserial primary key,
  loan_id       bigint references loans(id) on delete set null,
  member_id     bigint not null references members(id),
  type          text not null check (type in ('overdue','lost','damaged')),
  amount        int not null check (amount >= 0),
  status        text not null default 'unpaid' check (status in ('unpaid','paid','waived')),
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  waived_reason text,
  staff_id      bigint references staff(id)
);
create index if not exists fines_member_idx on fines(member_id);

-- ---------- ២. មុខងារជំនួយ ----------

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_user_id = auth.uid());
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_user_id = auth.uid() and role = 'admin');
$$;

create or replace function my_member_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from members where auth_user_id = auth.uid();
$$;

create or replace function current_staff_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from staff where auth_user_id = auth.uid();
$$;

-- រំកិលទៅថ្ងៃធ្វើការបន្ទាប់ បើត្រូវចំថ្ងៃឈប់សម្រាក
create or replace function next_working_day(d date) returns date
language plpgsql stable set search_path = public as $$
begin
  while exists (select 1 from holidays where date = d) loop
    d := d + 1;
  end loop;
  return d;
end $$;

-- ចំនួនថ្ងៃហួសកំណត់ (មិនរាប់ថ្ងៃឈប់សម្រាក)
create or replace function days_late(p_due date, p_until date) returns int
language sql stable set search_path = public as $$
  select count(*)::int
  from generate_series(p_due + 1, p_until, interval '1 day') g(d)
  where p_until > p_due
    and not exists (select 1 from holidays h where h.date = g.d::date);
$$;

-- ពិន័យហួសកំណត់ = ថ្ងៃហួស × អត្រា (មិនលើសតម្លៃសៀវភៅ បើមានតម្លៃ)
create or replace function overdue_fine(p_loan_id bigint, p_until date default current_date) returns int
language sql stable set search_path = public as $$
  select case
           when b.price > 0 then least(days_late(l.due_date, p_until) * t.fine_per_day, b.price)
           else days_late(l.due_date, p_until) * t.fine_per_day
         end
  from loans l
  join members m on m.id = l.member_id
  join member_types t on t.id = m.type_id
  join book_copies c on c.id = l.copy_id
  join books b on b.id = c.book_id
  where l.id = p_loan_id;
$$;

-- ---------- ៣. Views ----------

create or replace view v_loans with (security_invoker = true) as
select l.*,
       c.barcode, c.book_id, b.title, b.cover_url,
       m.name as member_name, m.member_code, m.phone as member_phone,
       case when l.return_date is null then days_late(l.due_date, current_date) else days_late(l.due_date, l.return_date) end as days_late,
       case when l.return_date is null then overdue_fine(l.id) else 0 end as accrued_fine,
       case
         when l.return_date is not null then 'returned'
         when l.due_date < current_date then 'overdue'
         else 'on_loan'
       end as loan_status
from loans l
join book_copies c on c.id = l.copy_id
join books b on b.id = c.book_id
join members m on m.id = l.member_id;

create or replace view v_member_status with (security_invoker = true) as
select m.id as member_id,
       (select count(*) from loans l where l.member_id = m.id and l.return_date is null)::int as open_loans,
       (select count(*) from loans l where l.member_id = m.id and l.return_date is null and l.due_date < current_date)::int as overdue_loans,
       ( coalesce((select sum(amount) from fines f where f.member_id = m.id and f.status = 'unpaid'), 0)
       + coalesce((select sum(overdue_fine(l.id)) from loans l where l.member_id = m.id and l.return_date is null and l.due_date < current_date), 0)
       )::int as unpaid_fines
from members m;

create or replace view v_book_availability with (security_invoker = true) as
select b.id as book_id,
       count(c.id) filter (where c.status not in ('withdrawn','lost'))::int as total,
       count(c.id) filter (where c.status = 'available')::int as available
from books b left join book_copies c on c.book_id = b.id
group by b.id;

-- view សរុប (មិនបង្ហាញព័ត៌មានផ្ទាល់ខ្លួន) — ប្រើលើទំព័រដើមសាធារណៈ
create or replace view v_top_books as
select b.id as book_id, b.title, b.cover_url, count(l.id)::int as loan_count
from books b
join book_copies c on c.book_id = b.id
join loans l on l.copy_id = c.id
group by b.id
order by loan_count desc;

-- របាយការណ៍ ១២ ខែចុងក្រោយ (សម្រាប់បុគ្គលិក)
create or replace view v_monthly_stats with (security_invoker = true) as
select to_char(g.m, 'YYYY-MM') as month,
       (select count(*) from loans l where date_trunc('month', l.loan_date) = g.m)::int as loans,
       (select count(*) from loans l where date_trunc('month', l.return_date) = g.m)::int as returns,
       (select count(*) from members x where date_trunc('month', x.joined_date) = g.m)::int as new_members,
       (select coalesce(sum(amount), 0) from fines f where f.status = 'paid' and date_trunc('month', f.paid_at) = g.m)::int as fines_collected
from generate_series(date_trunc('month', current_date) - interval '11 months',
                     date_trunc('month', current_date), interval '1 month') g(m)
order by 1;

create or replace view v_top_members with (security_invoker = true) as
select m.id as member_id, m.name, m.member_code, count(l.id)::int as loan_count
from members m join loans l on l.member_id = m.id
group by m.id
order by loan_count desc;

-- ---------- ៤. ដំណើរការអាជីវកម្ម (RPC) ----------

-- ខ្ចីសៀវភៅ
create or replace function checkout(p_member_code text, p_barcodes text[])
returns json language plpgsql security definer set search_path = public as $$
declare
  m members; t member_types; s settings;
  st record; v_due date; b text; c book_copies; n int;
begin
  if not is_staff() then raise exception 'អ្នកគ្មានសិទ្ធិធ្វើការខ្ចីទេ'; end if;
  n := coalesce(array_length(p_barcodes, 1), 0);
  if n = 0 then raise exception 'សូមស្កេនសៀវភៅយ៉ាងហោចណាស់មួយក្បាល'; end if;

  select * into m from members where member_code = upper(trim(p_member_code));
  if not found then raise exception 'រកមិនឃើញសមាជិក %', p_member_code; end if;
  if m.status <> 'active' then raise exception 'សមាជិកនេះមិនសកម្ម'; end if;
  if m.expiry_date < current_date then raise exception 'កាតសមាជិកផុតកំណត់តាំងពី %', m.expiry_date; end if;

  select * into t from member_types where id = m.type_id;
  select * into s from settings where id = 1;
  select * into st from v_member_status where member_id = m.id;

  if st.overdue_loans > 0 then raise exception 'សមាជិកមានសៀវភៅហួសកំណត់ % ក្បាល — សូមសងសិន', st.overdue_loans; end if;
  if st.unpaid_fines > s.max_unpaid_fine then raise exception 'ពិន័យមិនទាន់បង់ % រៀល លើសកម្រិត % រៀល', st.unpaid_fines, s.max_unpaid_fine; end if;
  if st.open_loans + n > t.max_books then
    raise exception 'ខ្ចីបានច្រើនបំផុត % ក្បាល (កំពុងខ្ចី % ក្បាល)', t.max_books, st.open_loans;
  end if;

  v_due := next_working_day(current_date + t.loan_days);

  foreach b in array p_barcodes loop
    select * into c from book_copies where barcode = upper(trim(b)) for update;
    if not found then raise exception 'រកមិនឃើញសៀវភៅលេខ %', b; end if;
    if c.status <> 'available' then raise exception 'សៀវភៅ % មិននៅទំនេរ (ស្ថានភាព: %)', c.barcode, c.status; end if;
    insert into loans (copy_id, member_id, due_date, staff_id) values (c.id, m.id, v_due, current_staff_id());
    update book_copies set status = 'on_loan' where id = c.id;
  end loop;

  return json_build_object('member_name', m.name, 'due_date', v_due, 'count', n);
end $$;

-- សងសៀវភៅ
create or replace function return_book(p_barcode text, p_condition text default 'good',
                                       p_damage_fee int default 0, p_pay_now boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare
  c book_copies; l loans; m members; v_fine int; v_late int; v_title text;
begin
  if not is_staff() then raise exception 'អ្នកគ្មានសិទ្ធិទេ'; end if;
  if p_condition not in ('good','damaged') then raise exception 'ស្ថានភាពមិនត្រឹមត្រូវ'; end if;

  select * into c from book_copies where barcode = upper(trim(p_barcode)) for update;
  if not found then raise exception 'រកមិនឃើញសៀវភៅលេខ %', p_barcode; end if;
  select * into l from loans where copy_id = c.id and return_date is null for update;
  if not found then raise exception 'សៀវភៅ % មិនមានការខ្ចីទេ', c.barcode; end if;
  select * into m from members where id = l.member_id;
  select title into v_title from books where id = c.book_id;

  v_late := days_late(l.due_date, current_date);
  v_fine := coalesce(overdue_fine(l.id), 0);

  update loans set return_date = current_date, return_condition = p_condition where id = l.id;
  update book_copies set status = case when p_condition = 'damaged' then 'damaged' else 'available' end where id = c.id;

  if v_fine > 0 then
    insert into fines (loan_id, member_id, type, amount, status, paid_at, staff_id)
    values (l.id, m.id, 'overdue', v_fine,
            case when p_pay_now then 'paid' else 'unpaid' end,
            case when p_pay_now then now() end, current_staff_id());
  end if;
  if p_condition = 'damaged' and p_damage_fee > 0 then
    insert into fines (loan_id, member_id, type, amount, status, paid_at, staff_id)
    values (l.id, m.id, 'damaged', p_damage_fee,
            case when p_pay_now then 'paid' else 'unpaid' end,
            case when p_pay_now then now() end, current_staff_id());
  end if;

  return json_build_object('title', v_title, 'member_name', m.name, 'member_code', m.member_code,
                           'due_date', l.due_date, 'days_late', v_late, 'fine', v_fine,
                           'damage_fee', case when p_condition = 'damaged' then p_damage_fee else 0 end);
end $$;

-- បន្តពេល (បុគ្គលិក ឬសមាជិកម្ចាស់ផ្ទាល់)
create or replace function renew_loan(p_loan_id bigint)
returns date language plpgsql security definer set search_path = public as $$
declare l loans; t member_types; v_due date;
begin
  select * into l from loans where id = p_loan_id for update;
  if not found or l.return_date is not null then raise exception 'រកមិនឃើញការខ្ចីដែលកំពុងបើក'; end if;
  if not (is_staff() or l.member_id = my_member_id()) then raise exception 'អ្នកគ្មានសិទ្ធិទេ'; end if;
  if l.due_date < current_date then raise exception 'សៀវភៅហួសកំណត់ហើយ មិនអាចបន្តបានទេ'; end if;
  select t2.* into t from members m join member_types t2 on t2.id = m.type_id where m.id = l.member_id;
  if l.renew_count >= t.max_renews then raise exception 'បានបន្តអស់ចំនួនកំណត់ (% ដង) ហើយ', t.max_renews; end if;
  v_due := next_working_day(l.due_date + t.loan_days);
  update loans set due_date = v_due, renew_count = renew_count + 1 where id = l.id;
  return v_due;
end $$;

-- សៀវភៅបាត់
create or replace function mark_lost(p_loan_id bigint)
returns int language plpgsql security definer set search_path = public as $$
declare l loans; v_price int; v_fee int; v_overdue int;
begin
  if not is_staff() then raise exception 'អ្នកគ្មានសិទ្ធិទេ'; end if;
  select * into l from loans where id = p_loan_id and return_date is null for update;
  if not found then raise exception 'រកមិនឃើញការខ្ចីដែលកំពុងបើក'; end if;
  select b.price into v_price from book_copies c join books b on b.id = c.book_id where c.id = l.copy_id;
  select lost_fee into v_fee from settings where id = 1;
  v_overdue := coalesce(overdue_fine(l.id), 0);
  update loans set return_date = current_date, return_condition = 'lost' where id = l.id;
  update book_copies set status = 'lost' where id = l.copy_id;
  insert into fines (loan_id, member_id, type, amount, staff_id)
  values (l.id, l.member_id, 'lost', v_price + v_fee, current_staff_id());
  if v_overdue > 0 then
    insert into fines (loan_id, member_id, type, amount, staff_id)
    values (l.id, l.member_id, 'overdue', v_overdue, current_staff_id());
  end if;
  return v_price + v_fee + v_overdue;
end $$;

create or replace function pay_fine(p_fine_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'អ្នកគ្មានសិទ្ធិទេ'; end if;
  update fines set status = 'paid', paid_at = now(), staff_id = current_staff_id()
  where id = p_fine_id and status = 'unpaid';
  if not found then raise exception 'ពិន័យនេះបានបង់ ឬលើកលែងរួចហើយ'; end if;
end $$;

create or replace function waive_fine(p_fine_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'មានតែអ្នកគ្រប់គ្រងទេ ដែលលើកលែងពិន័យបាន'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'សូមសរសេរមូលហេតុ'; end if;
  update fines set status = 'waived', waived_reason = p_reason, staff_id = current_staff_id()
  where id = p_fine_id and status = 'unpaid';
  if not found then raise exception 'ពិន័យនេះបានបង់ ឬលើកលែងរួចហើយ'; end if;
end $$;

-- ---------- ៥. Row Level Security ----------

alter table settings     enable row level security;
alter table member_types enable row level security;
alter table categories   enable row level security;
alter table authors      enable row level security;
alter table publishers   enable row level security;
alter table books        enable row level security;
alter table book_copies  enable row level security;
alter table members      enable row level security;
alter table staff        enable row level security;
alter table holidays     enable row level security;
alter table loans        enable row level security;
alter table fines        enable row level security;

-- កាតាឡុក៖ អ្នកណាក៏មើលបាន / បុគ្គលិកកែ / អ្នកគ្រប់គ្រងលុប
do $$
declare t text;
begin
  foreach t in array array['categories','authors','publishers','books','book_copies'] loop
    execute format('drop policy if exists %1$s_read on %1$s', t);
    execute format('create policy %1$s_read on %1$s for select using (true)', t);
    execute format('drop policy if exists %1$s_ins on %1$s', t);
    execute format('create policy %1$s_ins on %1$s for insert with check (is_staff())', t);
    execute format('drop policy if exists %1$s_upd on %1$s', t);
    execute format('create policy %1$s_upd on %1$s for update using (is_staff())', t);
    execute format('drop policy if exists %1$s_del on %1$s', t);
    execute format('create policy %1$s_del on %1$s for delete using (is_admin())', t);
  end loop;
  -- ការកំណត់៖ អ្នកណាក៏មើលបាន / តែអ្នកគ្រប់គ្រងកែ
  foreach t in array array['settings','member_types','holidays'] loop
    execute format('drop policy if exists %1$s_read on %1$s', t);
    execute format('create policy %1$s_read on %1$s for select using (true)', t);
    execute format('drop policy if exists %1$s_write on %1$s', t);
    execute format('create policy %1$s_write on %1$s for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

drop policy if exists members_read on members;
create policy members_read on members for select using (is_staff() or auth_user_id = auth.uid());
drop policy if exists members_ins on members;
create policy members_ins on members for insert with check (is_staff());
drop policy if exists members_upd on members;
create policy members_upd on members for update using (is_staff());
drop policy if exists members_del on members;
create policy members_del on members for delete using (is_admin());

drop policy if exists staff_read on staff;
create policy staff_read on staff for select using (is_staff());
drop policy if exists staff_write on staff;
create policy staff_write on staff for all using (is_admin()) with check (is_admin());

-- ខ្ចី និងពិន័យ៖ សរសេរតាម RPC ខាងលើប៉ុណ្ណោះ
drop policy if exists loans_read on loans;
create policy loans_read on loans for select using (is_staff() or member_id = my_member_id());
drop policy if exists loans_del on loans;
create policy loans_del on loans for delete using (is_admin());

drop policy if exists fines_read on fines;
create policy fines_read on fines for select using (is_staff() or member_id = my_member_id());
drop policy if exists fines_del on fines;
create policy fines_del on fines for delete using (is_admin());

grant select on v_top_books, v_book_availability to anon, authenticated;
grant select on v_loans, v_member_status, v_monthly_stats, v_top_members to authenticated;

-- ---------- ៦. ទិន្នន័យដំបូង ----------

insert into settings (id) values (1) on conflict do nothing;

insert into member_types (name, max_books, loan_days, max_renews, fine_per_day) values
  ('សិស្ស / អ្នកសិក្សា', 2, 7, 1, 200),
  ('អ្នកភូមិ / សហគមន៍', 3, 14, 1, 500),
  ('គ្រូ / បុគ្គលិក', 5, 21, 2, 500),
  ('ព្រះសង្ឃ', 5, 21, 2, 0)
on conflict (name) do nothing;

insert into categories (name, ddc_code) values
  ('ទូទៅ', '000'), ('ទស្សនវិជ្ជា និងចិត្តវិទ្យា', '100'), ('ព្រះពុទ្ធសាសនា', '200'),
  ('វិទ្យាសាស្ត្រសង្គម', '300'), ('ភាសា', '400'), ('វិទ្យាសាស្ត្រ', '500'),
  ('បច្ចេកវិទ្យា និងកសិកម្ម', '600'), ('សិល្បៈ និងកីឡា', '700'),
  ('អក្សរសាស្ត្រ', '800'), ('ប្រវត្តិសាស្ត្រ និងភូមិសាស្ត្រ', '900'), ('សៀវភៅកុមារ', null)
on conflict (name) do nothing;
