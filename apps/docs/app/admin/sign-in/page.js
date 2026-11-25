import AdminSignInForm from '../../../components/admin/AdminSignInForm';

export const metadata = {
  title: 'Admin Sign In',
};

export default function AdminSignInPage() {
  return (
    <div className="admin-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16" style={{ background: 'var(--admin-bg)' }}>
      <div className="admin-aurora" aria-hidden />
      <div className="relative w-full">
        <AdminSignInForm />
      </div>
    </div>
  );
}
