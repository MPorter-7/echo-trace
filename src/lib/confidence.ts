export interface ConfidenceSignalInput {
  exactUsername?: boolean
  similarUsername?: boolean
  matchingDisplayName?: boolean
  matchingKnownUrl?: boolean
  matchingPlatform?: boolean
  matchingDateRange?: boolean
  matchingBioKeyword?: boolean
  conflictingDisplayName?: boolean
  conflictingDate?: boolean
  conflictingUserLocation?: boolean
}

const SIGNALS: Array<{ key: keyof ConfidenceSignalInput; weight: number; label: string }> = [
  { key: 'exactUsername', weight: 35, label: 'Exact username match' },
  { key: 'similarUsername', weight: 15, label: 'Similar username' },
  { key: 'matchingDisplayName', weight: 15, label: 'Matching display name' },
  { key: 'matchingKnownUrl', weight: 25, label: 'Known URL match' },
  { key: 'matchingPlatform', weight: 5, label: 'Expected platform' },
  { key: 'matchingDateRange', weight: 10, label: 'Matching date range' },
  { key: 'matchingBioKeyword', weight: 5, label: 'Matching public bio keyword' },
  { key: 'conflictingDisplayName', weight: -30, label: 'Conflicting display name' },
  { key: 'conflictingDate', weight: -25, label: 'Conflicting date' },
  { key: 'conflictingUserLocation', weight: -20, label: 'Conflicting user-supplied location' },
]

const OPPOSING_SIGNALS: Partial<Record<keyof ConfidenceSignalInput, keyof ConfidenceSignalInput>> = {
  exactUsername: 'similarUsername',
  similarUsername: 'exactUsername',
  matchingDisplayName: 'conflictingDisplayName',
  conflictingDisplayName: 'matchingDisplayName',
  matchingDateRange: 'conflictingDate',
  conflictingDate: 'matchingDateRange',
}

export function updateConfidenceSignal(input: ConfidenceSignalInput, key: keyof ConfidenceSignalInput, checked: boolean) {
  const next = { ...input, [key]: checked }
  const opposing = OPPOSING_SIGNALS[key]
  if (checked && opposing) next[opposing] = false
  return next
}

export function normalizeConfidenceSignals(input: ConfidenceSignalInput) {
  const normalized = { ...input }
  if (normalized.exactUsername && normalized.similarUsername) normalized.similarUsername = false
  if (normalized.conflictingDisplayName && normalized.matchingDisplayName) normalized.matchingDisplayName = false
  if (normalized.conflictingDate && normalized.matchingDateRange) normalized.matchingDateRange = false
  return normalized
}

export function confidenceLevel(score: number) {
  if (score >= 80) return 'high' as const
  if (score >= 50) return 'medium' as const
  return 'low' as const
}

export function calculateConfidence(input: ConfidenceSignalInput) {
  const normalized = normalizeConfidenceSignals(input)
  const matchingSignals: string[] = []
  const conflictingSignals: string[] = []
  let score = 10
  for (const signal of SIGNALS) {
    if (!normalized[signal.key]) continue
    score += signal.weight
    if (signal.weight > 0) matchingSignals.push(signal.label)
    else conflictingSignals.push(signal.label)
  }
  score = Math.max(0, Math.min(100, score))
  const level = confidenceLevel(score)
  const explanation = matchingSignals.length || conflictingSignals.length
    ? `Deterministic ${level}-confidence estimate based on ${matchingSignals.length} supporting and ${conflictingSignals.length} conflicting signal${conflictingSignals.length === 1 ? '' : 's'}.`
    : 'Low-confidence estimate because no identity signals have been recorded.'
  return { score, level, matchingSignals, conflictingSignals, explanation }
}

export function canTransitionMatch(from: string, to: string) {
  const statuses = new Set(['pending', 'accepted', 'rejected', 'uncertain'])
  return statuses.has(from) && statuses.has(to) && from !== to
}
