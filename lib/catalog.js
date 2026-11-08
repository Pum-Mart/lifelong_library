'use client';
// រក ឬបង្កើតអ្នកនិពន្ធ / អ្នកបោះពុម្ព តាមឈ្មោះ
export async function findOrCreate(sb, table, name) {
  const n = (name || '').trim();
  if (!n) return null;
  const { data: found } = await sb.from(table).select('id').eq('name', n).limit(1).maybeSingle();
  if (found) return found.id;
  const { data, error } = await sb.from(table).insert({ name: n }).select('id').single();
  if (error) throw error;
  return data.id;
}
