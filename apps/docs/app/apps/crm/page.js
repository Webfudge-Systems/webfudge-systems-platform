import { redirect } from 'next/navigation';

export const metadata = { title: 'CRM — Fudge Grow' };

export default function CrmAppPage() {
  redirect('/applications/crm');
}
