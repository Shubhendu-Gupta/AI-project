import type { SessionStats, ModelUsage } from '../types/session';

const parseCost = (s: string): number => parseFloat(s.replace(/[$,]/g, '')) || 0;

const parseTokenCount = (s: string): number => {
  const n = s.trim().replace(/,/g, '');
  if (n.endsWith('k')) return parseFloat(n) * 1000;
  if (n.endsWith('m')) return parseFloat(n) * 1_000_000;
  return parseFloat(n) || 0;
};

const parseModelLine = (line: string): ModelUsage | null => {
  // e.g. "   claude-sonnet-4-5:  571 input, 35.9k output, 4.2m cache read, 170.0k cache write ($2.43)"
  const modelMatch = line.match(/^\s*([\w.-]+):\s*(.*)/);
  if (!modelMatch) return null;

  const [, model, rest] = modelMatch;
  const inputMatch = rest.match(/([\d.]+[km]?)\s+input/i);
  const outputMatch = rest.match(/([\d.]+[km]?)\s+output/i);
  const cacheReadMatch = rest.match(/([\d.]+[km]?)\s+cache read/i);
  const cacheWriteMatch = rest.match(/([\d.]+[km]?)\s+cache write/i);
  const costMatch = rest.match(/\(\$([\d.,]+)\)/);

  return {
    model,
    inputTokens: inputMatch ? parseTokenCount(inputMatch[1]) : 0,
    outputTokens: outputMatch ? parseTokenCount(outputMatch[1]) : 0,
    cacheReadTokens: cacheReadMatch ? parseTokenCount(cacheReadMatch[1]) : 0,
    cacheWriteTokens: cacheWriteMatch ? parseTokenCount(cacheWriteMatch[1]) : 0,
    cost: costMatch ? parseCost(costMatch[1]) : 0,
  };
};

export const parseSessionOutput = (text: string): SessionStats => {
  const costMatch = text.match(/Total cost:\s*\$?([\d.,]+)/i);
  const apiDurMatch = text.match(/Total duration \(API\):\s*([\w\s:]+?)(?:\n|Total)/i);
  const wallDurMatch = text.match(/Total duration \(wall\):\s*([\w\s:]+?)(?:\n|Total)/i);
  const codeMatch = text.match(/Total code changes:\s*([\d,]+)\s+lines added,\s*([\d,]+)\s+lines removed/i);

  const modelSection = text.match(/Usage by model:([\s\S]*?)(?:\n\s*\n|$)/i);
  const modelUsage: ModelUsage[] = [];

  if (modelSection) {
    const lines = modelSection[1].split('\n').filter(Boolean);
    for (const line of lines) {
      const parsed = parseModelLine(line);
      if (parsed) modelUsage.push(parsed);
    }
  }

  return {
    totalCost: costMatch ? parseCost(costMatch[1]) : 0,
    totalDurationApi: apiDurMatch ? apiDurMatch[1].trim() : '',
    totalDurationWall: wallDurMatch ? wallDurMatch[1].trim() : '',
    linesAdded: codeMatch ? parseInt(codeMatch[1].replace(/,/g, ''), 10) : 0,
    linesRemoved: codeMatch ? parseInt(codeMatch[2].replace(/,/g, ''), 10) : 0,
    modelUsage,
  };
};

export const formatNumber = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}k`
    : String(n);
