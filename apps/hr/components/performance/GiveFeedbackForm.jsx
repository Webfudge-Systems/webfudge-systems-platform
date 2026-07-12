'use client'

import { MessageSquare } from 'lucide-react'
import { FormSectionCard, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

const TYPE_OPTIONS = [
  { value: 'Peer', label: 'Peer' },
  { value: 'Manager', label: 'Manager' },
]

const PERIOD_OPTIONS = [
  { value: 'Q1 2026', label: 'Q1 2026' },
  { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' },
  { value: 'Q4 2026', label: 'Q4 2026' },
  { value: 'Annual 2026', label: 'Annual 2026' },
]

export function giveFeedbackToForm(pending, received) {
  if (received) {
    return {
      quote: received.quote || '',
      period: received.period || '',
      type: received.type === 'Manager' ? 'Manager' : 'Peer',
    }
  }

  return {
    quote: '',
    period: pending?.reviewCycle || 'Q2 2026',
    type: pending?.type === 'Manager' ? 'Manager' : 'Peer',
  }
}

export function GiveFeedbackForm({ form, onChange, pendingLabel }) {
  return (
    <div className="space-y-6">
      {pendingLabel ? (
        <p className="text-sm text-gray-600">
          Responding to <span className="font-semibold text-gray-900">{pendingLabel}</span>
        </p>
      ) : null}
      <FormSectionCard
        icon={MessageSquare}
        title="Your feedback"
        description="Share constructive, specific feedback. Received feedback is anonymized."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Textarea
              label="Feedback *"
              value={form.quote}
              onChange={(event) => onChange('quote', event.target.value)}
              placeholder="Describe strengths, impact, and areas for growth..."
              rows={5}
              required
            />
          </div>
          <div>
            <Select
              label="Period *"
              value={form.period}
              onChange={(value) => onChange('period', value)}
              options={PERIOD_OPTIONS}
              placeholder="Select period"
            />
          </div>
          <div>
            <Select
              label="Type"
              value={form.type}
              onChange={(value) => onChange('type', value)}
              options={TYPE_OPTIONS}
              placeholder="Select type"
            />
          </div>
        </div>
      </FormSectionCard>
    </div>
  )
}
