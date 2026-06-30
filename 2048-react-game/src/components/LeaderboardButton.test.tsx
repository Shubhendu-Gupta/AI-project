import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeaderboardButton } from './LeaderboardButton';

describe('LeaderboardButton', () => {
  it('should render button with text and icon', () => {
    const onClick = vi.fn();
    render(<LeaderboardButton onClick={onClick} />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByLabelText('View leaderboard')).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<LeaderboardButton onClick={onClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have trophy icon', () => {
    const onClick = vi.fn();
    const { container } = render(<LeaderboardButton onClick={onClick} />);

    const icon = container.querySelector('.trophy-icon');
    expect(icon).toBeInTheDocument();
    expect(icon?.textContent).toBe('🏆');
  });
});
