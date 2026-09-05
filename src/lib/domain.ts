const COMPOUND_PUBLIC_SUFFIXES = new Set(['co.jp', 'co.nz', 'co.uk', 'com.au', 'com.br', 'com.mx'])

const CANONICAL_DOMAIN_ALIASES = new Map([
  ['facebookmail.com', 'facebook.com'],
  ['twitter.com', 'x.com'],
])

export function registrableDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^www\./, '').replace(/\.+$/, '')
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length <= 2) return CANONICAL_DOMAIN_ALIASES.get(normalized) ?? normalized
  const suffixLength = COMPOUND_PUBLIC_SUFFIXES.has(parts.slice(-2).join('.')) ? 2 : 1
  const root = parts.slice(-(suffixLength + 1)).join('.')
  return CANONICAL_DOMAIN_ALIASES.get(root) ?? root
}

export function serviceNameFromDomain(domain: string) {
  const parts = domain.split('.').filter(Boolean)
  const compoundSuffix = parts.length >= 3 && COMPOUND_PUBLIC_SUFFIXES.has(parts.slice(-2).join('.'))
  const brand = parts.at(compoundSuffix ? -3 : -2) ?? parts[0] ?? domain
  if (brand.toLowerCase() === 'x') return 'X'
  return brand.split(/[-_]/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

export function isSuspiciousDomain(domain: string) {
  const brand = domain.split('.')[0] ?? ''
  const digits = [...brand].filter((character) => /\d/.test(character)).length
  return domain.includes('xn--') || brand.length > 38 || (brand.length >= 10 && digits / brand.length >= 0.4) || (brand.match(/-/g)?.length ?? 0) >= 4
}
