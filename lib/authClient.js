'use client';
import { supabaseBrowser } from './supabase/client';

export async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, ...data };
}

// ចាកចេញ៖ scope 'local' (ឧបករណ៍នេះ) ឬ 'global' (គ្រប់ឧបករណ៍)
export async function signOut(scope = 'local', to = '/login') {
  await postJSON('/api/auth/logout', { scope }).catch(() => {});
  await supabaseBrowser().auth.signOut({ scope: 'local' }).catch(() => {});
  location.href = to;
}

export const AUTH_EVENT = {
  sign_in: { label: 'ចូលប្រព័ន្ធ', tone: 'green' },
  sign_in_failed: { label: 'ចូលបរាជ័យ', tone: 'red' },
  sign_in_locked: { label: 'ចាក់សោ (ខុសច្រើនដង)', tone: 'red' },
  sign_out: { label: 'ចាកចេញ', tone: 'gray' },
  sign_out_all: { label: 'ចាកចេញគ្រប់ឧបករណ៍', tone: 'gray' },
  password_changed: { label: 'ប្ដូរពាក្យសម្ងាត់', tone: 'blue' },
  password_reset_requested: { label: 'ស្នើកំណត់ពាក្យសម្ងាត់', tone: 'amber' },
  password_reset: { label: 'កំណត់ពាក្យសម្ងាត់ថ្មី', tone: 'blue' },
  admin_set_password: { label: 'អ្នកគ្រប់គ្រងកំណត់ពាក្យសម្ងាត់', tone: 'amber' },
  admin_disabled: { label: 'អ្នកគ្រប់គ្រងបិទគណនី', tone: 'red' },
  admin_enabled: { label: 'អ្នកគ្រប់គ្រងបើកគណនី', tone: 'green' },
  admin_signed_out: { label: 'អ្នកគ្រប់គ្រងបណ្ដេញចេញ', tone: 'amber' },
  admin_changed_email: { label: 'អ្នកគ្រប់គ្រងប្ដូរ Email', tone: 'amber' },
  admin_deleted: { label: 'អ្នកគ្រប់គ្រងលុបគណនី', tone: 'red' },
};

// ពិពណ៌នាឧបករណ៍ពី user-agent ឱ្យខ្លី
export function deviceName(ua) {
  if (!ua) return '—';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [br, os].filter(Boolean).join(' · ') || ua.slice(0, 40);
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const t = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(t.getDate())}/${p(t.getMonth() + 1)}/${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
