'use client';

import { AuthLayout, SignupFormSection } from '../../components/sections';

export default function SignupPage() {
  return (
    <AuthLayout
      title="Join Us Today!"
      subtitle="Start Your Journey with Webfudge Platform"
    >
      <SignupFormSection />
    </AuthLayout>
  );
}
