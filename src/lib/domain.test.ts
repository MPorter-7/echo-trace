import { describe, expect, it } from 'vitest'
import { isSuspiciousDomain, registrableDomain, serviceNameFromDomain } from './domain'

describe('registrableDomain', () => {
  it('reduces a subdomain to its registrable domain for common TLDs', () => {
    expect(registrableDomain('accounts.example.com')).toBe('example.com')
    expect(registrableDomain('www.example.com')).toBe('example.com')
  })

  it('uses the public suffix list for compound suffixes instead of a hardcoded list', () => {
    expect(registrableDomain('sub.example.co.uk')).toBe('example.co.uk')
    expect(registrableDomain('foo.co.in')).toBe('foo.co.in')
    expect(registrableDomain('bar.co.in')).toBe('bar.co.in')
  })

  it('does not merge distinct accounts registered under the same compound suffix', () => {
    expect(registrableDomain('foo.co.in')).not.toBe(registrableDomain('bar.co.in'))
  })

  it('applies canonical aliases after resolving the registrable domain', () => {
    expect(registrableDomain('facebookmail.com')).toBe('facebook.com')
    expect(registrableDomain('twitter.com')).toBe('x.com')
  })

  it('falls back to the input for unlisted or single-label hosts', () => {
    expect(registrableDomain('one-off.test')).toBe('one-off.test')
    expect(registrableDomain('localhost')).toBe('localhost')
  })
})

describe('serviceNameFromDomain', () => {
  it('derives a capitalized brand name from the registrable label', () => {
    expect(serviceNameFromDomain('example.com')).toBe('Example')
    expect(serviceNameFromDomain('accounts.security.example.com')).toBe('Example')
    expect(serviceNameFromDomain('example.co.uk')).toBe('Example')
  })

  it('special-cases the single-letter X brand', () => {
    expect(serviceNameFromDomain('x.com')).toBe('X')
  })
})

describe('isSuspiciousDomain', () => {
  it('flags punycode and heavily hyphenated or digit-heavy domains', () => {
    expect(isSuspiciousDomain('xn--exmple-cua.com')).toBe(true)
    expect(isSuspiciousDomain('a-b-c-d-e.com')).toBe(true)
    expect(isSuspiciousDomain('example.com')).toBe(false)
  })
})
