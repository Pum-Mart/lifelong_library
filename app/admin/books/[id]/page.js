'use client';
import BookForm from '@/components/BookForm';
import { PageTitle } from '@/components/ui';

export default function EditBook({ params }) {
  return (<><PageTitle title="កែសៀវភៅ" /><BookForm id={params.id} /></>);
}
