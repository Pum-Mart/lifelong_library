-- =========================================================
-- ការគ្រប់គ្រងការចូល/ចេញប្រព័ន្ធ (ដំណើរការក្រោយ schema.sql)
-- =========================================================

-- ១. បិទ/បើកគណនីបុគ្គលិក
alter table staff add column if not exists active boolean not null default true;

-- បុគ្គលិកដែលបានបិទ បាត់សិទ្ធិភ្លាមៗ (RLS ទាំងអស់ប្រើមុខងារទាំងនេះ)
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_user_id = auth.uid() and active);
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where auth_user_id = auth.uid() and role = 'admin' and active);
$$;

create or replace function current_staff_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from staff where auth_user_id = auth.uid() and active;
$$;

-- បុគ្គលិកអាចមើលជួរផ្ទាល់ខ្លួន (ដើម្បីដឹងថាគណនីត្រូវបានបិទ)
drop policy if exists staff_read on staff;
create policy staff_read on staff for select using (is_staff() or auth_user_id = auth.uid());

-- ២. កំណត់ហេតុចូល/ចេញ
create table if not exists auth_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  email       text,
  event       text not null check (event in (
                'sign_in','sign_in_failed','sign_in_locked','sign_out','sign_out_all',
                'password_changed','password_reset_requested','password_reset',
                'admin_set_password','admin_disabled','admin_enabled','admin_signed_out',
                'admin_changed_email','admin_deleted')),
  actor_id    uuid,                 -- អ្នកគ្រប់គ្រងដែលធ្វើសកម្មភាព (បើមាន)
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists auth_events_user_idx  on auth_events(user_id, created_at desc);
create index if not exists auth_events_email_idx on auth_events(lower(email), created_at desc);
create index if not exists auth_events_time_idx  on auth_events(created_at desc);

alter table auth_events enable row level security;
-- សរសេរតែពី server (service role) / អានបាន៖ ខ្លួនឯង ឬអ្នកគ្រប់គ្រង
drop policy if exists auth_events_read on auth_events;
create policy auth_events_read on auth_events for select using (user_id = auth.uid() or is_admin());

-- ៣. អ្នកគ្រប់គ្រងបង្ខំឱ្យចេញពីគ្រប់ឧបករណ៍ (លុប session ទាំងអស់)
create or replace function admin_revoke_sessions(p_user_id uuid) returns int
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  if not is_admin() then raise exception 'មានតែអ្នកគ្រប់គ្រងទេ'; end if;
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function admin_revoke_sessions(uuid) from public, anon;
grant execute on function admin_revoke_sessions(uuid) to authenticated;
