import type { IdentifierType } from '../types/echo'

export interface ValidationResult {
  valid: boolean
  error: string | null
  normalized?: string
}

export function validateIdentifier(type: IdentifierType, rawValue: string): ValidationResult {
  const value = rawValue.trim()
  if (!value) return { valid: false, error: 'Enter an identifier.' }
  if (value.length > 500) return { valid: false, error: 'Keep the identifier under 500 characters.' }

  if (type === 'email') {
    const normalized = value.toLowerCase()
    return /^\S+@\S+\.\S+$/.test(normalized)
      ? { valid: true, error: null, normalized }
      : { valid: false, error: 'Enter a valid email address.' }
  }

  if (type === 'profile_url' || type === 'website') {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
      return { valid: true, error: null, normalized: url.toString() }
    } catch {
      return { valid: false, error: 'Enter a complete public http:// or https:// URL.' }
    }
  }

  return { valid: true, error: null, normalized: value }
}

export function validateTimelineEvent(input: { title: string; datePrecision: string; eventDate?: string; approximateYear?: string }) {
  if (!input.title.trim()) return { valid: false, error: 'Title is required.' }
  if (input.title.trim().length > 160) return { valid: false, error: 'Keep the title under 160 characters.' }
  if (input.datePrecision === 'exact' && !input.eventDate) return { valid: false, error: 'Choose the event date.' }
  if (['month', 'year'].includes(input.datePrecision) && !input.approximateYear) return { valid: false, error: 'Enter the approximate year.' }
  if (input.approximateYear) {
    const year = Number(input.approximateYear)
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) return { valid: false, error: 'Enter a valid year.' }
  }
  return { valid: true, error: null }
}
