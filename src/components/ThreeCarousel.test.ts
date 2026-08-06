import { describe, expect, it } from 'vitest'
import { hasWebGLSupport } from './ThreeCarousel'

describe('3D carousel capability check', () => {
  it('uses the fallback when no WebGL context is available', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(hasWebGLSupport(() => canvas)).toBe(false)
  })

  it('uses the fallback when browser context detection throws', () => {
    expect(hasWebGLSupport(() => { throw new Error('WebGL blocked') })).toBe(false)
  })

  it('allows the 3D carousel when WebGL is available', () => {
    const canvas = {
      getContext: (kind: string) => kind === 'webgl2' ? {} : null,
    } as unknown as HTMLCanvasElement
    expect(hasWebGLSupport(() => canvas)).toBe(true)
  })
})
