import type { LeaderboardEntry } from '../types/leaderboard';

const LEADERBOARD_KEY = 'game2048-leaderboard';
const MAX_ENTRIES = 10;

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    return [];
  }
};

export const addLeaderboardEntry = (score: number, maxTile: number): LeaderboardEntry[] => {
  try {
    const entries = getLeaderboard();
    const newEntry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random()}`,
      score,
      date: new Date().toISOString(),
      maxTile,
    };

    const updatedEntries = [...entries, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedEntries));
    return updatedEntries;
  } catch (error) {
    console.error('Failed to save leaderboard entry:', error);
    return getLeaderboard();
  }
};

export const clearLeaderboard = (): void => {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch (error) {
    console.error('Failed to clear leaderboard:', error);
  }
};

export const isTopScore = (score: number): boolean => {
  const entries = getLeaderboard();
  if (entries.length < MAX_ENTRIES) return true;
  return score > entries[entries.length - 1].score;
};
