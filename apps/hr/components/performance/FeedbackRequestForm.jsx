'use client'

import { MessageSquare } from 'lucide-react'
import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { listReviewCycles } from '../../lib/performanceReviewsService'

const TYPE_OPTIONS = [
  { value: 'Peer', label: 'Peer' },
  { value: 'Manager', label: 'Manager' },
]

export function feedbackRequestToForm(item) {
  if (!item) {
    return {
      label: '',
      due: '',
      type: 'Peer',
      reviewCycle: '',
    }
  }

  return {
    label: item.label || '',
    due: item.due || '',
    type: item.type === 'Manager' ? 'Manager' : 'Peer',
    reviewCycle: item.reviewCycle || '',
  }
}

export default function FeedbackRequestForm({ form, onChange }) {
  const reviewCycleOptions = [
    { value: '', label: 'Select review cycle' },
    ...listReviewCycles().map((cycle) => ({
      value: cycle.name,
      label: `${cycle.name} (${cycle.period})`,
    })),
  ]

  return (
    <FormSectionCard
      icon={MessageSquare}
      title="Feedback request"
      description="Define who the feedback is for, when it is due, and the review cycle"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Input
            label="Request label *"
            value={form.label}
            onChange={(event) => onChange('label', event.target.value)}
            placeholder="e.g. Peer review for Ankit Sharma"
            required
          />
        </div>
        <div>
          <Select
            label="Type *"
            value={form.type}
            onChange={(value) => onChange('type', value)}
            options={TYPE_OPTIONS}
            placeholder="Select type"
          />
        </div>
        <div>
          <Input
            label="Due date"
            type="date"
            value={form.due}
            onChange={(event) => onChange('due', event.target.value)}
          />
        </div>
        <div>
          <Select
            label="Review cycle"
            value={form.reviewCycle}
            onChange={(value) => onChange('reviewCycle', value)}
            options={reviewCycleOptions}
            placeholder="Select review cycle"
          />
        </div>
      </div>
    </FormSectionCard>
  )
}
