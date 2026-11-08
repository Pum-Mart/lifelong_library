-- កន្លែងទុករូបភាព (ក្របសៀវភៅ រូបថតសមាជិក ឡូហ្គោ)
-- ដំណើរការបន្ទាប់ពី schema.sql
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media staff write" on storage.objects;
create policy "media staff write" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "media staff update" on storage.objects;
create policy "media staff update" on storage.objects
  for update using (bucket_id = 'media' and public.is_staff());
