import { redirect } from 'next/navigation';

export const metadata = { title: 'Accounts — Fudge Base' };

export default function AccountsAppPage() {
  redirect('/applications/accounts');
}