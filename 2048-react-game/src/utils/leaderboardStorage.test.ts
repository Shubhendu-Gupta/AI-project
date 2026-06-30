import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLeaderboard,
  addLeaderboardEntry,
  clearLeaderboard,
  isTopScore,
} from './leaderboardStorage';

describe('leaderboardStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no data exists', () => {
      const result = getLeaderboard();
      expect(result).toEqual([]);
    });

    it('should return stored leaderboard entries', () => {
      const mockEntries = [
        { id: '1', score: 1000, date: '2024-01-01T00:00:00.000Z', maxTile: 128 },
      ];
      localStorage.setItem('game2048-leaderboard', JSON.stringify(mockEntries));

      const result = getLeaderboard();
      expect(result).toEqual(mockEntries);
    });

    it('should return empty array on parse error', () => {
      localStorage.setItem('game2048-leaderboard', 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = getLeaderboard();
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('addLeaderboardEntry', () => {
    it('should add new entry to empty leaderboard', () => {
      const result = addLeaderboardEntry(1000, 128);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(1000);
      expect(result[0].maxTile).toBe(128);
    });

    it('should sort entries by score descending', () => {
      addLeaderboardEntry(500, 64);
      const result = addLeaderboardEntry(1000, 128);

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(1000);
      expect(result[1].score).toBe(500);
    });

    it('should limit entries to 10', () => {
      for (let i = 1; i <= 12; i++) {
        addLeaderboardEntry(i * 100, i * 10);
      }

      const result = getLeaderboard();
      expect(result).toHaveLength(10);
      expect(result[0].score).toBe(1200);
      expect(result[9].score).toBe(300);
    });

    it('should create entry with id and date', () => {
      const result = addLeaderboardEntry(1000, 128);

      expect(result[0].id).toBeDefined();
      expect(result[0].date).toBeDefined();
      expect(new Date(result[0].date).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle localStorage errors gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = addLeaderboardEntry(1000, 128);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('clearLeaderboard', () => {
    it('should remove leaderboard from localStorage', () => {
      addLeaderboardEntry(1000, 128);
      expect(getLeaderboard()).toHaveLength(1);

      clearLeaderboard();
      expect(getLeaderboard()).toEqual([]);
    });

    it('should handle errors when clearing', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Cannot remove');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      clearLeaderboard();
      expect(consoleSpy).toHaveBeenCalled();

      removeItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('isTopScore', () => {
    it('should return true when leaderboard has less than 10 entries', () => {
      addLeaderboardEntry(500, 64);
      expect(isTopScore(100)).toBe(true);
    });

    it('should return true when score is higher than lowest entry', () => {
      for (let i = 1; i <= 10; i++) {
        addLeaderboardEntry(i * 100, i * 10);
      }

      expect(isTopScore(150)).toBe(true);
    });

    it('should return false when score is lower than lowest entry', () => {
      for (let i = 1; i <= 10; i++) {
        addLeaderboardEntry(i * 100, i * 10);
      }

      expect(isTopScore(50)).toBe(false);
    });

    it('should return true for empty leaderboard', () => {
      expect(isTopScore(100)).toBe(true);
    });
  });
});
