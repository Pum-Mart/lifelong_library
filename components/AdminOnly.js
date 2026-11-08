'use client';
import { useStaff } from '@/lib/staffContext';
import { Empty } from './ui';

export default function AdminOnly({ children }) {
  const staff = useStaff();
  if (staff?.role !== 'admin') return <Empty>ទំព័រនេះសម្រាប់តែអ្នកគ្រប់គ្រងប៉ុណ្ណោះ</Empty>;
  return children;
}
