'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// ផ្ទុករូបទៅ Supabase Storage bucket "media" ហើយផ្ដល់ URL សាធារណៈ
export default function ImageUpload({ value, onChange, folder = 'misc', label = 'ជ្រើសរូប' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function upload(file) {
    if (!file) return;
    setBusy(true); setErr('');
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from('media').upload(path, file, { upsert: false });
    if (error) setErr(error.message);
    else onChange(sb.storage.from('media').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-3">
      {value
        ? <img src={value} alt="" className="h-20 w-16 rounded border object-cover" />
        : <div className="flex h-20 w-16 items-center justify-center rounded border bg-gray-50 text-xs text-gray-400">គ្មានរូប</div>}
      <div className="text-sm">
        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
          {busy ? 'កំពុងផ្ទុក…' : label}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {value && <button type="button" className="ml-2 text-xs text-red-600" onClick={() => onChange('')}>ដករូប</button>}
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}
