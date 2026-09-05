import psl from 'psl'

const CANONICAL_DOMAIN_ALIASES = new Map([
  ['facebookmail.com', 'facebook.com'],
  ['twitter.com', 'x.com'],
])

export function registrableDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^www\./, '').replace(/\.+$/, '')
  const root = psl.get(normalized) ?? normalized
  return CANONICAL_DOMAIN_ALIASES.get(root) ?? root
}

export function serviceNameFromDomain(domain: string) {
  const parsed = psl.parse(domain)
  const brand = ('sld' in parsed ? parsed.sld : null) ?? domain.split('.').filter(Boolean)[0] ?? domain
  if (brand.toLowerCase() === 'x') return 'X'
  return brand.split(/[-_]/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

export function isSuspiciousDomain(domain: string) {
  const brand = domain.split('.')[0] ?? ''
  const digits = [...brand].filter((character) => /\d/.test(character)).length
  return domain.includes('xn--') || brand.length > 38 || (brand.length >= 10 && digits / brand.length >= 0.4) || (brand.match(/-/g)?.length ?? 0) >= 4
}
