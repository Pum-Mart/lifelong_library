'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from './supabase/client';

// ប្រាប់ថាអ្នកប្រើជានរណា: បុគ្គលិក (admin/librarian) ឬសមាជិក
export function useAuth() {
  const [state, setState] = useState({ loading: true, user: null, staff: null, member: null });
  useEffect(() => {
    const sb = supabaseBrowser();
    let alive = true;
    async function load() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return alive && setState({ loading: false, user: null, staff: null, member: null });
      const [{ data: staff }, { data: member }] = await Promise.all([
        sb.from('staff').select('*').eq('auth_user_id', user.id).maybeSingle(),
        sb.from('members').select('*').eq('auth_user_id', user.id).maybeSingle(),
      ]);
      // បុគ្គលិកដែលត្រូវបានបិទ មិនរាប់ជាបុគ្គលិកទេ
      if (alive) setState({ loading: false, user, staff: staff?.active === false ? null : staff, member, disabled: staff?.active === false });
    }
    load();
    const { data: sub } = sb.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}
