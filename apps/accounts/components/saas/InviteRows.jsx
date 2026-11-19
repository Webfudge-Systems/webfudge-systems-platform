'use client'

import { Plus, X } from 'lucide-react'

const ROLES = [
  ['member', 'Member'],
  ['manager', 'Manager'],
  ['admin', 'Admin'],
]

export default function InviteRows({ rows, setRows, disabled }) {
  const update = (i, key, value) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)))
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <label className="sr-only" htmlFor={`invite-email-${i}`}>Teammate {i + 1} email</label>
          <input
            id={`invite-email-${i}`}
            type="email"
            value={row.email}
            disabled={disabled}
            onChange={(e) => update(i, 'email', e.target.value)}
            placeholder="name@company.com"
            className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3.5 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
          />
          <label className="sr-only" htmlFor={`invite-role-${i}`}>Role</label>
          <select
            id={`invite-role-${i}`}
            value={row.role}
            disabled={disabled}
            onChange={(e) => update(i, 'role', e.target.value)}
            className="min-h-[48px] w-[130px] flex-shrink-0 rounded-xl border border-gray-300 bg-white px-3 text-[15px] outline-none focus:border-orange-500"
          >
            {ROLES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {rows.length > 1 && (
            <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100" aria-label={`Remove teammate ${i + 1}`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < 10 && (
        <button type="button" onClick={() => setRows((r) => [...r, { email: '', role: 'member' }])} className="flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-orange-600 hover:underline">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add another
        </button>
      )}
    </div>
  )
}
