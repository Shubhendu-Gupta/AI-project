import { render } from '@testing-library/react'
import { SkeletonCard } from './SkeletonCard'

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument()
  })
})

