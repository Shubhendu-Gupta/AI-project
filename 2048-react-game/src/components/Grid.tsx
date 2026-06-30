import type { Tile as TileType } from '../types';
import { Tile } from './Tile';
import './Grid.css';

type GridProps = {
  tiles: TileType[];
};

export const Grid = ({ tiles }: GridProps) => {
  const cells = Array(16).fill(null);

  return (
    <div className="grid-container">
      <div className="grid-cells">
        {cells.map((_, index) => (
          <div key={index} className="grid-cell" />
        ))}
      </div>
      <div className="grid-tiles">
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} />
        ))}
      </div>
    </div>
  );
};
