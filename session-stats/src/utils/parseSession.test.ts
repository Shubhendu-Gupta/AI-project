import { parseSessionOutput, formatNumber } from './parseSession';

const SAMPLE = `
  Total cost:            $2.43
  Total duration (API):  8m 18s
  Total duration (wall): 2d 10h 36m
  Total code changes:    1857 lines added, 461 lines removed
  Usage by model:
     claude-sonnet-4-5:  571 input, 35.9k output, 4.2m cache read, 170.0k cache write ($2.43)
`;

describe('parseSessionOutput', () => {
  it('parses total cost', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.totalCost).toBeCloseTo(2.43);
  });

  it('parses API duration', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.totalDurationApi).toBe('8m 18s');
  });

  it('parses wall duration', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.totalDurationWall).toBe('2d 10h 36m');
  });

  it('parses lines added', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.linesAdded).toBe(1857);
  });

  it('parses lines removed', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.linesRemoved).toBe(461);
  });

  it('parses model usage', () => {
    const result = parseSessionOutput(SAMPLE);
    expect(result.modelUsage).toHaveLength(1);
    const m = result.modelUsage[0];
    expect(m.model).toBe('claude-sonnet-4-5');
    expect(m.inputTokens).toBe(571);
    expect(m.outputTokens).toBeCloseTo(35900);
    expect(m.cacheReadTokens).toBeCloseTo(4200000);
    expect(m.cacheWriteTokens).toBeCloseTo(170000);
    expect(m.cost).toBeCloseTo(2.43);
  });

  it('returns zeros for empty input', () => {
    const result = parseSessionOutput('');
    expect(result.totalCost).toBe(0);
    expect(result.linesAdded).toBe(0);
    expect(result.modelUsage).toHaveLength(0);
  });

  it('handles multiple models', () => {
    const multi = `
      Total cost: $5.00
      Usage by model:
         claude-opus-4-8:  100 input, 1k output, 0 cache read, 0 cache write ($3.00)
         claude-haiku-4-5:  50 input, 500 output, 0 cache read, 0 cache write ($2.00)
    `;
    const result = parseSessionOutput(multi);
    expect(result.modelUsage).toHaveLength(2);
    expect(result.modelUsage[0].model).toBe('claude-opus-4-8');
    expect(result.modelUsage[1].model).toBe('claude-haiku-4-5');
  });
});

describe('formatNumber', () => {
  it('formats millions', () => {
    expect(formatNumber(4_200_000)).toBe('4.2M');
  });

  it('formats thousands', () => {
    expect(formatNumber(35900)).toBe('35.9k');
  });

  it('formats small numbers as-is', () => {
    expect(formatNumber(571)).toBe('571');
  });
});
