import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tile } from './Tile';
import { Tile as TileType } from '../types';

describe('Tile', () => {
  it('should render tile with correct value', () => {
    const tile: TileType = {
      id: '1',
      value: 2,
      position: { row: 0, col: 0 },
    };

    render(<Tile tile={tile} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should apply correct CSS class for tile value', () => {
    const tile: TileType = {
      id: '1',
      value: 4,
      position: { row: 0, col: 0 },
    };

    const { container } = render(<Tile tile={tile} />);
    const tileElement = container.querySelector('.tile-4');
    expect(tileElement).toBeInTheDocument();
  });

  it('should apply correct transform based on position', () => {
    const tile: TileType = {
      id: '1',
      value: 2,
      position: { row: 1, col: 2 },
    };

    const { container } = render(<Tile tile={tile} />);
    const tileElement = container.querySelector('.tile');
    expect(tileElement).toHaveStyle({ transform: 'translate(240px, 120px)' });
  });

  it('should apply new tile animation class', () => {
    const tile: TileType = {
      id: '1',
      value: 2,
      position: { row: 0, col: 0 },
      isNew: true,
    };

    const { container } = render(<Tile tile={tile} />);
    const tileElement = container.querySelector('.tile-new');
    expect(tileElement).toBeInTheDocument();
  });
});
