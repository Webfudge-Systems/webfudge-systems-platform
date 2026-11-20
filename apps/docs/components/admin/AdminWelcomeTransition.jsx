'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function AdminWelcomeTransition({ show, name }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="admin-shell fixed inset-0 z-[140] flex items-center justify-center px-4"
          style={{ background: 'var(--admin-bg)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="admin-aurora" aria-hidden />

          <motion.div
            className="relative text-center"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--admin-accent-soft)',
                color: 'var(--admin-accent)',
                border: '1px solid var(--admin-border-strong)',
              }}
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 16 }}
            >
              <ShieldCheck className="h-7 w-7" />
            </motion.div>

            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: 'var(--admin-accent)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Authentication successful
            </motion.p>

            <h3
              className="mt-3 text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: 'var(--admin-text)' }}
            >
              Welcome <span className="admin-welcome-name">{name || 'Admin'}</span>
            </h3>

            <motion.p
              className="mx-auto mt-4 max-w-md text-sm"
              style={{ color: 'var(--admin-muted)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              Preparing your admin workspace…
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
