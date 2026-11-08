export const riel = (n) => `${Number(n || 0).toLocaleString('en-US')} ៛`;

export function fmtDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const COPY_STATUS = {
  available: { label: 'នៅទំនេរ', tone: 'green' },
  on_loan: { label: 'កំពុងខ្ចី', tone: 'blue' },
  lost: { label: 'បាត់', tone: 'red' },
  damaged: { label: 'ខូច', tone: 'amber' },
  withdrawn: { label: 'ដកចេញ', tone: 'gray' },
};

export const LOAN_STATUS = {
  on_loan: { label: 'កំពុងខ្ចី', tone: 'blue' },
  overdue: { label: 'ហួសកំណត់', tone: 'red' },
  returned: { label: 'បានសង', tone: 'green' },
};

export const FINE_STATUS = {
  unpaid: { label: 'មិនទាន់បង់', tone: 'red' },
  paid: { label: 'បានបង់', tone: 'green' },
  waived: { label: 'លើកលែង', tone: 'gray' },
};

export const FINE_TYPE = { overdue: 'ហួសកំណត់', lost: 'បាត់សៀវភៅ', damaged: 'ខូចសៀវភៅ' };

export const MEMBER_STATUS = {
  active: { label: 'សកម្ម', tone: 'green' },
  suspended: { label: 'ផ្អាក', tone: 'amber' },
  inactive: { label: 'អសកម្ម', tone: 'gray' },
};

// សារកំហុសពី Supabase → ភាសាខ្មែរដែលអានបាន
export function errText(error) {
  if (!error) return '';
  const msg = error.message || String(error);
  if (msg.includes('row-level security')) return 'អ្នកគ្មានសិទ្ធិធ្វើសកម្មភាពនេះទេ';
  if (msg.includes('duplicate key')) return 'ទិន្នន័យនេះមានរួចហើយ';
  if (msg.includes('foreign key')) return 'មិនអាចលុបបានទេ ព្រោះមានទិន្នន័យផ្សេងភ្ជាប់';
  if (msg.includes('Invalid login')) return 'Email ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ';
  return msg;
}
