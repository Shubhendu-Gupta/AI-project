import { useState, useCallback } from 'react';
import type { ParsedSession } from '../types/session';
import { parseSessionOutput } from '../utils/parseSession';

export const useSessionParser = () => {
  const [sessions, setSessions] = useState<ParsedSession[]>([]);

  const addSession = useCallback((raw: string) => {
    try {
      const stats = parseSessionOutput(raw);
      setSessions((prev) => [...prev, { raw, stats, error: null }]);
    } catch (err) {
      setSessions((prev) => [
        ...prev,
        { raw, stats: null, error: err instanceof Error ? err.message : 'Parse error' },
      ]);
    }
  }, []);

  const removeSession = useCallback((index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => setSessions([]), []);

  const totals = sessions.reduce(
    (acc, s) => {
      if (!s.stats) return acc;
      return {
        totalCost: acc.totalCost + s.stats.totalCost,
        linesAdded: acc.linesAdded + s.stats.linesAdded,
        linesRemoved: acc.linesRemoved + s.stats.linesRemoved,
      };
    },
    { totalCost: 0, linesAdded: 0, linesRemoved: 0 }
  );

  return { sessions, addSession, removeSession, clearAll, totals };
};
