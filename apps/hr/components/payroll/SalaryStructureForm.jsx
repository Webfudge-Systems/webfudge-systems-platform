'use client'

import { useMemo } from 'react'
import { Input, FormSectionCard } from '@webfudge/ui'
import { Landmark } from 'lucide-react'

export function salaryStructureToForm(structure) {
  if (!structure) {
    return {
      name: '',
      ctc: '',
      basicPercent: '40',
      hraPercent: '20',
      specialAllowancePercent: '30',
      fbpPercent: '10',
    }
  }
  return {
    name: structure.name || '',
    ctc: String(structure.ctc ?? ''),
    basicPercent: String(structure.basicPercent ?? 40),
    hraPercent: String(structure.hraPercent ?? 20),
    specialAllowancePercent: String(structure.specialAllowancePercent ?? 30),
    fbpPercent: String(structure.fbpPercent ?? 10),
  }
}

export default function SalaryStructureForm({ form, onChange }) {
  const handleChange = (field, value) => {
    onChange(field, value)
  }

  const monthly = useMemo(() => Math.round(Number(form.ctc || 0) / 12), [form.ctc])
  const pct = (value) => Number(value || 0)
  const preview = useMemo(() => {
    const basic = Math.round((monthly * pct(form.basicPercent)) / 100)
    const hra = Math.round((monthly * pct(form.hraPercent)) / 100)
    const special = Math.round((monthly * pct(form.specialAllowancePercent)) / 100)
    const fbp = Math.round((monthly * pct(form.fbpPercent)) / 100)
    const totalPct = pct(form.basicPercent) + pct(form.hraPercent) + pct(form.specialAllowancePercent) + pct(form.fbpPercent)
    return { basic, hra, special, fbp, totalPct }
  }, [monthly, form.basicPercent, form.hraPercent, form.specialAllowancePercent, form.fbpPercent])

  return (
    <FormSectionCard
      icon={Landmark}
      title="Salary structure"
      description="Default CTC and component split for a role family"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label="Structure name *"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Manager Band"
            required
          />
        </div>
        <Input
          label="Default annual CTC (₹) *"
          type="number"
          min="0"
          value={form.ctc}
          onChange={(e) => handleChange('ctc', e.target.value)}
          required
        />
        <Input label="Basic %" type="number" min="0" max="100" value={form.basicPercent} onChange={(e) => handleChange('basicPercent', e.target.value)} />
        <Input label="HRA %" type="number" min="0" max="100" value={form.hraPercent} onChange={(e) => handleChange('hraPercent', e.target.value)} />
        <Input label="Special Allowance %" type="number" min="0" max="100" value={form.specialAllowancePercent} onChange={(e) => handleChange('specialAllowancePercent', e.target.value)} />
        <Input label="FBP %" type="number" min="0" max="100" value={form.fbpPercent} onChange={(e) => handleChange('fbpPercent', e.target.value)} />
        <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Monthly component preview</p>
          <p className="mt-1">Basic: ₹{preview.basic.toLocaleString('en-IN')} · HRA: ₹{preview.hra.toLocaleString('en-IN')} · Special: ₹{preview.special.toLocaleString('en-IN')} · FBP: ₹{preview.fbp.toLocaleString('en-IN')}</p>
          <p className={`mt-1 ${preview.totalPct === 100 ? 'text-emerald-700' : 'text-red-600'}`}>
            Total allocation: {preview.totalPct}% {preview.totalPct === 100 ? '(valid)' : '(should be 100%)'}
          </p>
        </div>
      </div>
    </FormSectionCard>
  )
}
