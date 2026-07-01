import { getGradient } from './gradientPlaceholder'

describe('getGradient', () => {
  it('returns a CSS gradient string', () => {
    const result = getGradient('Hello World')
    expect(result).toMatch(/^linear-gradient/)
  })

  it('is deterministic — same input produces same output', () => {
    expect(getGradient('React News')).toBe(getGradient('React News'))
  })

  it('produces different gradients for different titles', () => {
    expect(getGradient('Title A')).not.toBe(getGradient('Title B'))
  })
})
