'use client';

/**
 * CRM/HR-style list table shell — pair with `@webfudge/ui` `Table` using `variant="modern"`.
 */
export default function VLMDataTableCard({ children, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  );
}
