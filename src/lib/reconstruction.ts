import type { Identifier } from '../types/echo'

export interface ReconstructionCounts {
  identifiers: number
  archiveFiles: number
  matches: number
}

export function normalizeAccountEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null
}

export function hasVerifiedAccountEmail(identifiers: Identifier[], accountEmail: string | null | undefined) {
  const normalized = normalizeAccountEmail(accountEmail)
  if (!normalized) return false

  return identifiers.some((identifier) => (
    identifier.type === 'email'
    && identifier.verification_status === 'verified_account'
    && normalizeAccountEmail(identifier.value) === normalized
  ))
}

export function findStartingEmail(identifiers: Identifier[], accountEmail?: string | null) {
  const normalizedAccountEmail = normalizeAccountEmail(accountEmail)
  const verified = identifiers.find((identifier) => (
    identifier.type === 'email' && identifier.verification_status === 'verified_account'
    && (!normalizedAccountEmail || normalizeAccountEmail(identifier.value) === normalizedAccountEmail)
  ))

  return verified?.value ?? normalizedAccountEmail
}

export function reconstructionProgress(counts: ReconstructionCounts, hasStartingEmail: boolean) {
  const completed = [
    hasStartingEmail,
    counts.identifiers > 1,
    counts.archiveFiles > 0,
    counts.matches > 0,
  ].filter(Boolean).length

  return completed * 25
}
