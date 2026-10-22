'use client';

import { Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminSignInForm from './AdminSignInForm';

export default function AdminGateOverlay({ open }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="admin-shell fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-md"
          style={{ background: 'rgba(2, 6, 18, 0.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border p-6 sm:p-8"
            style={{ background: 'var(--admin-panel)', borderColor: 'var(--admin-border-strong)' }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full" style={{ background: 'var(--admin-glow-1)', filter: 'blur(60px)' }} />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-52 w-52 rounded-full" style={{ background: 'var(--admin-glow-2)', filter: 'blur(60px)' }} />
            <div className="relative">
              <div className="mb-6 text-center">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)' }}
                >
                  <Lock className="h-5 w-5" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--admin-muted)' }}>
                  Authorized Access Only
                </p>
                <h2 className="mt-2 text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                  Documentation Admin
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--admin-muted)' }}>
                  Please sign in with an authorized account to continue.
                </p>
              </div>

              <AdminSignInForm compact />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
