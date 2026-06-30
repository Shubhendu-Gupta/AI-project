export interface LeaderboardEntry {
  id: string;
  score: number;
  date: string;
  maxTile: number;
}

export interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore?: number;
}
