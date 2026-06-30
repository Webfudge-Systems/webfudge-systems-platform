import { redirect } from 'next/navigation';

export const metadata = { title: 'PM — Fudge Flow' };

export default function PmAppPage() {
  redirect('/applications/pm');
}
