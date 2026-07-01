export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
}

export interface SessionStats {
  totalCost: number;
  totalDurationApi: string;
  totalDurationWall: string;
  linesAdded: number;
  linesRemoved: number;
  modelUsage: ModelUsage[];
}

export interface ParsedSession {
  raw: string;
  stats: SessionStats | null;
  error: string | null;
}
