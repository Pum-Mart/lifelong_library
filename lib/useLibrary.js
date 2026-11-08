'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from './supabase/client';

export function useLibrary() {
  const [lib, setLib] = useState(null);
  useEffect(() => {
    supabaseBrowser().from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setLib(data));
  }, []);
  return lib;
}
