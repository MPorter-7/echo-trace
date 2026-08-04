import type { Identifier } from '../types/echo'

export interface GuidedSearch {
  id: string
  label: string
  description: string
  buildUrl: (identifier: Identifier, platform?: string) => string
}

export const guidedSearchConnectors: GuidedSearch[] = [
  {
    id: 'exact-web',
    label: 'Exact web search',
    description: 'Search the exact identifier on the public web.',
    buildUrl: (identifier) => `https://www.google.com/search?q=${encodeURIComponent(`"${identifier.value}"`)}`,
  },
  {
    id: 'username-platform',
    label: 'Username + platform',
    description: 'Search an exact identifier with a platform name.',
    buildUrl: (identifier, platform = '') => `https://www.google.com/search?q=${encodeURIComponent(`"${identifier.value}" ${platform}`.trim())}`,
  },
  {
    id: 'wayback',
    label: 'Wayback lookup',
    description: 'Look for archived versions of a URL you supplied.',
    buildUrl: (identifier) => `https://web.archive.org/web/*/${encodeURIComponent(identifier.value)}`,
  },
]

export function validatePublicArchiveUrl(value: string) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}
