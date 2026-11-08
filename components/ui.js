'use client';
import Link from 'next/link';
import { useState } from 'react';

export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${inputCls} pr-16 ${className}`} />
      <button type="button" tabIndex={-1} onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 px-3 text-xs text-gray-500 hover:text-brand-600">{show ? 'លាក់' : 'បង្ហាញ'}</button>
    </div>
  );
}

export function PageTitle({ title, sub, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-brand-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

const btn = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-brand-600 hover:bg-brand-50',
};

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${btn[variant]} ${className}`}
    />
  );
}

export function LinkButton({ href, variant = 'primary', className = '', children }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${btn[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100';

export function Input(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`}>{children}</select>;
}

const tones = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  gray: 'bg-gray-100 text-gray-700',
};

export function Badge({ tone = 'gray', children }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value, tone: 'gray' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Alert({ tone = 'red', children }) {
  if (!children) return null;
  const c = { red: 'border-red-200 bg-red-50 text-red-800', green: 'border-green-200 bg-green-50 text-green-800', amber: 'border-amber-200 bg-amber-50 text-amber-800', blue: 'border-blue-200 bg-blue-50 text-blue-800' };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${c[tone]}`}>{children}</div>;
}

export function Empty({ children = 'មិនមានទិន្នន័យ' }) {
  return <div className="py-10 text-center text-sm text-gray-400">{children}</div>;
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            {head.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

export const td = 'px-2 py-2 align-middle';

export function Stat({ label, value, tone = 'brand', href }) {
  const c = { brand: 'text-brand-700', red: 'text-red-600', amber: 'text-amber-600', green: 'text-green-700' };
  const body = (
    <Card className="h-full">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${c[tone]}`}>{value}</div>
    </Card>
  );
  return href ? <Link href={href} className="block hover:opacity-80">{body}</Link> : body;
}

export function Spinner() {
  return <div className="py-10 text-center text-sm text-gray-400">កំពុងផ្ទុក…</div>;
}
