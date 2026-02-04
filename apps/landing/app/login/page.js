'use client';

import { AuthLayout, LoginFormSection } from '../../components/sections';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Hey, Hello!"
      subtitle="Welcome to Webfudge Platform"
    >
      <LoginFormSection />
    </AuthLayout>
  );
}
