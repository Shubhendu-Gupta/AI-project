import type { Tile as TileType } from '../types';
import './Tile.css';

type TileProps = {
  tile: TileType;
};

export const Tile = ({ tile }: TileProps) => {
  const { value, position, isNew } = tile;

  return (
    <div
      className={`tile tile-${value} ${isNew ? 'tile-new' : ''}`}
      style={{
        transform: `translate(${position.col * 120}px, ${position.row * 120}px)`,
      }}
    >
      {value}
    </div>
  );
};
