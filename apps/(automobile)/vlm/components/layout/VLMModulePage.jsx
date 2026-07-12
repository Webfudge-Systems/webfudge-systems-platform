'use client';

/**
 * Standard VLM module page shell — matches HR/CRM `p-4 space-y-4 bg-white min-h-full`.
 */
export default function VLMModulePage({ children, className = '' }) {
  return <div className={`min-h-full space-y-4 bg-white p-4 ${className}`.trim()}>{children}</div>;
}
