import { timeAgo } from './timeAgo'

describe('timeAgo', () => {
  it('returns "just now" for times under a minute ago', () => {
    const recent = new Date(Date.now() - 30_000).toISOString()
    expect(timeAgo(recent)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(timeAgo(fiveMin)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const threeHours = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(timeAgo(threeHours)).toBe('3h ago')
  })

  it('returns days ago', () => {
    const twoDays = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(twoDays)).toBe('2d ago')
  })

  it('returns weeks ago', () => {
    const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(twoWeeks)).toBe('2w ago')
  })

  it('returns "just now" for future dates (clock skew)', () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString()
    expect(timeAgo(future)).toBe('just now')
  })
})
