'use client'

import { LayoutTemplate, FilePlus2 } from 'lucide-react'
import { Card, Select } from '@webfudge/ui'

/**
 * "Start from" picker on New Project (ticket W4): blank project or a built-in template.
 * When a template is picked, shows its phases and a person picker per role.
 */
export default function ProjectTemplatePicker({
  templates,
  value,
  onChange,
  roleAssignments,
  onRoleChange,
  userOptions,
  disabled = false,
}) {
  const selected = templates.find((t) => t.key === value) || null
  const chip = (active) =>
    `flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
      active ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-gray-200 bg-white hover:border-orange-300'
    }`

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500">
            <LayoutTemplate className="h-4 w-4 text-white" />
          </span>
          <span>Start from</span>
        </span>
      }
      subtitle="Begin blank, or generate all phases and tasks from a template"
      variant="default"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Start from">
        <button type="button" role="radio" aria-checked={!value} disabled={disabled} onClick={() => onChange('')} className={chip(!value)}>
          <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-gray-900">Blank project</span>
            <span className="block text-xs text-gray-500">Add tasks yourself</span>
          </span>
        </button>
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={value === t.key}
            disabled={disabled}
            onClick={() => onChange(t.key)}
            className={chip(value === t.key)}
          >
            <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{t.name}</span>
              <span className="block text-xs text-gray-500">
                {t.taskCount} tasks · ~{t.durationDays} days
              </span>
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">{selected.description}</p>
          <ol className="flex flex-wrap gap-2 text-xs">
            {selected.phases.map((p, i) => (
              <li key={p.name} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-700">
                {i + 1}. {p.name} <span className="text-gray-400">({p.taskCount})</span>
              </li>
            ))}
          </ol>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Who does what</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {selected.roles.map((r) => (
                <Select
                  key={r.key}
                  label={r.label}
                  value={roleAssignments[r.key] || ''}
                  onChange={(v) => onRoleChange(r.key, v)}
                  options={userOptions}
                  placeholder={r.key === 'projectManager' ? 'Project manager below' : 'Unassigned'}
                  disabled={disabled}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Task dates are counted from the project start date. Unassigned roles can be filled in later on each task.
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
