import { describe, expect, it } from 'vitest'
import { mapFieldData, parseBudgetMinValue } from '../src'

describe('mapFieldData', () => {
  it('maps standard fields using the default mapping', () => {
    const result = mapFieldData([
      { name: 'full_name', values: ['Asha Rao'] },
      { name: 'email', values: ['asha@example.com'] },
      { name: 'phone_number', values: ['+919876543210'] },
      { name: 'budget_range', values: ['80L-1Cr'] },
      { name: 'when_do_you_plan_to_buy?', values: ['Immediately'] },
      { name: 'buying_for', values: ['Self use'] },
      { name: 'preferred_configuration', values: ['3BHK'] },
    ])
    expect(result.name).toBe('Asha Rao')
    expect(result.email).toBe('asha@example.com')
    expect(result.phone).toBe('+919876543210')
    expect(result.budgetRange).toBe('80L-1Cr')
    expect(result.timeline).toBe('immediate')
    expect(result.purpose).toBe('own_use')
    expect(result.configInterest).toBe('3BHK')
    expect(result.unmappedAnswers).toEqual({})
  })

  it('honours a per-project custom mapping over the defaults', () => {
    const result = mapFieldData(
      [
        { name: 'your_spending_plan', values: ['1.2 Cr+'] },
        { name: 'kab_kharidna_hai', values: ['3-6 months'] },
      ],
      {
        budget_range: ['your_spending_plan'],
        timeline: ['kab_kharidna_hai'],
      }
    )
    expect(result.budgetRange).toBe('1.2 Cr+')
    expect(result.timeline).toBe('three_to_six_months')
  })

  it('keeps unknown answers in unmappedAnswers instead of dropping them', () => {
    const result = mapFieldData([
      { name: 'full_name', values: ['Ravi'] },
      { name: 'favourite_amenity', values: ['Clubhouse'] },
    ])
    expect(result.unmappedAnswers).toEqual({ favourite_amenity: 'Clubhouse' })
  })

  it('preserves unrecognized enum values as unmapped rather than guessing', () => {
    const result = mapFieldData([{ name: 'timeline', values: ['whenever the stars align'] }])
    expect(result.timeline).toBeUndefined()
    expect(result.unmappedAnswers.timeline).toBe('whenever the stars align')
  })

  it('never throws on missing/empty field_data', () => {
    expect(() => mapFieldData(undefined)).not.toThrow()
    expect(mapFieldData([]).unmappedAnswers).toEqual({})
  })
})

describe('parseBudgetMinValue', () => {
  it('parses Indian notation lower bounds', () => {
    expect(parseBudgetMinValue('80L-1Cr')).toBe(8_000_000)
    expect(parseBudgetMinValue('1.2 Cr+')).toBe(12_000_000)
    expect(parseBudgetMinValue('50-60 lakhs')).toBe(5_000_000)
    expect(parseBudgetMinValue('₹75 lakh')).toBe(7_500_000)
  })

  it('parses plain and western notations', () => {
    expect(parseBudgetMinValue('9000000')).toBe(9_000_000)
    expect(parseBudgetMinValue('1.5m')).toBe(1_500_000)
    expect(parseBudgetMinValue('750k')).toBe(750_000)
  })

  it('returns undefined for garbage', () => {
    expect(parseBudgetMinValue(undefined)).toBeUndefined()
    expect(parseBudgetMinValue('not sure yet')).toBeUndefined()
  })
})
