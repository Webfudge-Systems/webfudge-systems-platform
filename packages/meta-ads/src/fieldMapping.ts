import type { MetaFieldDataEntry } from './types'

/**
 * Maps Meta lead-form field names to our qualifying fields. Field names come
 * from each form's configuration, so the mapping is configurable per project
 * (stored on the project's `metaFormFieldMapping` JSON) — never hardcoded.
 *
 * Example:
 * {
 *   budget_range: ['budget', 'what_is_your_budget?'],
 *   timeline: ['when_do_you_plan_to_buy?'],
 *   purpose: ['buying_for'],
 *   config_interest: ['preferred_configuration'],
 *   name: ['full_name'],
 *   email: ['email'],
 *   phone: ['phone_number'],
 * }
 */
export interface FieldMapping {
  name?: string[]
  email?: string[]
  phone?: string[]
  budget_range?: string[]
  timeline?: string[]
  purpose?: string[]
  config_interest?: string[]
}

export interface MappedLeadFields {
  name?: string
  email?: string
  phone?: string
  budgetRange?: string
  timeline?: 'immediate' | 'three_to_six_months' | 'browsing'
  purpose?: 'own_use' | 'investment'
  configInterest?: string
  /** Answers that didn't match any mapped field, kept for the lead record. */
  unmappedAnswers: Record<string, string>
}

export const DEFAULT_FIELD_MAPPING: Required<FieldMapping> = {
  name: ['full_name', 'name'],
  email: ['email', 'email_address'],
  phone: ['phone_number', 'phone', 'mobile_number'],
  budget_range: ['budget_range', 'budget', 'what_is_your_budget'],
  timeline: ['timeline', 'when_do_you_plan_to_buy', 'purchase_timeline'],
  purpose: ['purpose', 'buying_for', 'purchase_purpose'],
  config_interest: ['config_interest', 'configuration', 'preferred_configuration', 'bhk'],
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, '_')
}

const TIMELINE_SYNONYMS: Record<string, MappedLeadFields['timeline']> = {
  immediate: 'immediate',
  immediately: 'immediate',
  asap: 'immediate',
  within_3_months: 'immediate',
  '3_6_months': 'three_to_six_months',
  three_to_six_months: 'three_to_six_months',
  '3_to_6_months': 'three_to_six_months',
  '3-6_months': 'three_to_six_months',
  browsing: 'browsing',
  just_browsing: 'browsing',
  just_exploring: 'browsing',
  not_sure: 'browsing',
}

const PURPOSE_SYNONYMS: Record<string, MappedLeadFields['purpose']> = {
  own_use: 'own_use',
  self_use: 'own_use',
  end_use: 'own_use',
  to_live_in: 'own_use',
  personal_use: 'own_use',
  investment: 'investment',
  investing: 'investment',
  rental_income: 'investment',
}

function coerceTimeline(raw: string | undefined): MappedLeadFields['timeline'] {
  if (!raw) return undefined
  return TIMELINE_SYNONYMS[normalizeKey(raw)]
}

function coercePurpose(raw: string | undefined): MappedLeadFields['purpose'] {
  if (!raw) return undefined
  return PURPOSE_SYNONYMS[normalizeKey(raw)]
}

/**
 * Map a Meta lead's field_data array to our qualifying fields using a
 * per-project mapping merged over sensible defaults. Unknown answers are
 * preserved in `unmappedAnswers` so no captured signal is lost.
 */
export function mapFieldData(
  fieldData: MetaFieldDataEntry[] | undefined,
  mapping?: FieldMapping
): MappedLeadFields {
  const merged: Required<FieldMapping> = {
    name: mapping?.name?.length ? mapping.name : DEFAULT_FIELD_MAPPING.name,
    email: mapping?.email?.length ? mapping.email : DEFAULT_FIELD_MAPPING.email,
    phone: mapping?.phone?.length ? mapping.phone : DEFAULT_FIELD_MAPPING.phone,
    budget_range: mapping?.budget_range?.length
      ? mapping.budget_range
      : DEFAULT_FIELD_MAPPING.budget_range,
    timeline: mapping?.timeline?.length ? mapping.timeline : DEFAULT_FIELD_MAPPING.timeline,
    purpose: mapping?.purpose?.length ? mapping.purpose : DEFAULT_FIELD_MAPPING.purpose,
    config_interest: mapping?.config_interest?.length
      ? mapping.config_interest
      : DEFAULT_FIELD_MAPPING.config_interest,
  }

  const lookup = new Map<string, keyof Required<FieldMapping>>()
  for (const target of Object.keys(merged) as Array<keyof Required<FieldMapping>>) {
    for (const alias of merged[target]) {
      lookup.set(normalizeKey(alias), target)
    }
  }

  const result: MappedLeadFields = { unmappedAnswers: {} }

  for (const entry of fieldData || []) {
    if (!entry?.name) continue
    const value = Array.isArray(entry.values) ? entry.values.filter(Boolean).join(', ') : ''
    if (!value) continue
    const target = lookup.get(normalizeKey(entry.name))
    switch (target) {
      case 'name':
        result.name = value
        break
      case 'email':
        result.email = value
        break
      case 'phone':
        result.phone = value
        break
      case 'budget_range':
        result.budgetRange = value
        break
      case 'timeline':
        result.timeline = coerceTimeline(value)
        if (!result.timeline) result.unmappedAnswers[entry.name] = value
        break
      case 'purpose':
        result.purpose = coercePurpose(value)
        if (!result.purpose) result.unmappedAnswers[entry.name] = value
        break
      case 'config_interest':
        result.configInterest = value
        break
      default:
        result.unmappedAnswers[entry.name] = value
    }
  }

  return result
}

/**
 * Best-effort parse of a budget range's lower bound in absolute currency
 * units. Handles Indian notation (lakh/crore, ₹) and plain numbers:
 * "80L-1Cr" -> 8_000_000, "1.2 Cr+" -> 12_000_000, "50-60 lakhs" -> 5_000_000.
 */
export function parseBudgetMinValue(budgetRange: string | undefined): number | undefined {
  if (!budgetRange) return undefined
  const text = budgetRange.toLowerCase().replace(/[₹,]/g, '')
  const unitPattern = 'cr|crore|crores|lakhs|lakh|lacs|lac|l|k|mn|m'
  const match = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?`))
  if (!match || !match[1]) return undefined
  const num = parseFloat(match[1])
  if (Number.isNaN(num)) return undefined
  // "50-60 lakhs": the unit trails the range and applies to both bounds —
  // when the first number has no unit of its own, inherit the next one found.
  let unit: string | undefined = match[2]
  if (!unit) {
    const trailing = text
      .slice((match.index ?? 0) + match[0].length)
      .match(new RegExp(`\\b(${unitPattern})\\b`))
    unit = trailing?.[1]
  }
  switch (unit) {
    case 'cr':
    case 'crore':
    case 'crores':
      return Math.round(num * 10_000_000)
    case 'l':
    case 'lac':
    case 'lacs':
    case 'lakh':
    case 'lakhs':
      return Math.round(num * 100_000)
    case 'k':
      return Math.round(num * 1_000)
    case 'm':
    case 'mn':
      return Math.round(num * 1_000_000)
    default:
      return Math.round(num)
  }
}
