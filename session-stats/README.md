# session-stats

A React + TypeScript app for parsing and aggregating **Claude Code session summaries**. Paste one or more end-of-session outputs to visualize cost, token usage, code changes, and per-model breakdowns — individually and across sessions.

---

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm run test      # Jest unit tests
npm run typecheck # TypeScript compiler check
npm run lint      # oxlint
```

---

## Usage

When a Claude Code session ends it prints a summary block like this:

```
  Total cost:            $2.43
  Total duration (API):  8m 18s
  Total duration (wall): 2d 10h 36m
  Total code changes:    1857 lines added, 461 lines removed
  Usage by model:
     claude-sonnet-4-5:  571 input, 35.9k output, 4.2m cache read, 170.0k cache write ($2.43)
```

1. Open the app (`npm run dev`).
2. Paste the summary text into the textarea and click **Add Session**.
3. Repeat for as many sessions as you want.
4. The **Totals** banner aggregates cost and code changes across all sessions.
5. Each session card shows per-session stats and a per-model token/cost table.
6. Use **Remove** on a card or **Clear All** to manage the list.

---

## Project structure

```
src/
├── types/
│   └── session.ts          # Shared TypeScript interfaces
├── utils/
│   ├── parseSession.ts     # Parser + number formatter
│   └── parseSession.test.ts
├── hooks/
│   └── useSessionParser.ts # State management hook
├── components/
│   ├── SessionInput.tsx    # Textarea + submit button
│   ├── SessionCard.tsx     # Per-session stats card
│   └── TotalsSummary.tsx   # Aggregate totals banner
├── App.tsx
└── App.css
```

---

## Architecture

Data flows in one direction:

```
SessionInput  →  useSessionParser  →  SessionCard (×N)
                      │
                      └──────────→  TotalsSummary
```

`useSessionParser` is the single source of truth. It holds the `ParsedSession[]` array, exposes `addSession` / `removeSession` / `clearAll`, and derives `totals` via a `reduce` on every render — no separate state for aggregates.

`parseSessionOutput` (in `utils/parseSession.ts`) does all the text parsing with regex. It is a pure function with no side effects, which is why all 11 tests target it directly without any React involvement.

---

## Type reference

### `ModelUsage` — `src/types/session.ts`

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model identifier, e.g. `claude-sonnet-4-5` |
| `inputTokens` | `number` | Input tokens (raw count) |
| `outputTokens` | `number` | Output tokens (raw count) |
| `cacheReadTokens` | `number` | Cache-read tokens |
| `cacheWriteTokens` | `number` | Cache-write tokens |
| `cost` | `number` | Cost in USD for this model |

### `SessionStats` — `src/types/session.ts`

| Field | Type | Description |
|---|---|---|
| `totalCost` | `number` | Total session cost in USD |
| `totalDurationApi` | `string` | API time as printed, e.g. `8m 18s` |
| `totalDurationWall` | `string` | Wall-clock time, e.g. `2d 10h 36m` |
| `linesAdded` | `number` | Lines of code added |
| `linesRemoved` | `number` | Lines of code removed |
| `modelUsage` | `ModelUsage[]` | One entry per model used |

### `ParsedSession` — `src/types/session.ts`

| Field | Type | Description |
|---|---|---|
| `raw` | `string` | Original pasted text |
| `stats` | `SessionStats \| null` | Parsed result, or `null` on error |
| `error` | `string \| null` | Error message if parsing threw |

---

## API reference

### `parseSessionOutput(text: string): SessionStats`

`src/utils/parseSession.ts`

Pure function. Accepts any string containing a Claude Code session summary and returns a `SessionStats` object. Fields that cannot be found default to `0` or `''` — the function never throws on missing data.

Token counts support the suffixes Claude Code uses: bare integers, `k` (×1,000), and `m` (×1,000,000).

### `formatNumber(n: number): string`

`src/utils/parseSession.ts`

Human-readable token count formatter used in `SessionCard`.

| Input | Output |
|---|---|
| `571` | `"571"` |
| `35900` | `"35.9k"` |
| `4200000` | `"4.2M"` |

### `useSessionParser()`

`src/hooks/useSessionParser.ts`

React hook that manages the session list.

| Return value | Type | Description |
|---|---|---|
| `sessions` | `ParsedSession[]` | All sessions in insertion order |
| `addSession(raw)` | `(string) => void` | Parse and append a session |
| `removeSession(i)` | `(number) => void` | Remove session at index `i` |
| `clearAll()` | `() => void` | Remove all sessions |
| `totals.totalCost` | `number` | Sum of costs across valid sessions |
| `totals.linesAdded` | `number` | Sum of lines added |
| `totals.linesRemoved` | `number` | Sum of lines removed |

---

## Component reference

### `<SessionInput onAdd={fn} />`

Controlled textarea. Clears itself after a successful submit. The **Add Session** button is disabled while the textarea is empty.

### `<SessionCard session={s} index={i} onRemove={fn} />`

Renders a single `ParsedSession`. Shows an error state (red border) when `session.error` is set. Otherwise displays the five stat tiles and the per-model table. Token counts are formatted via `formatNumber`.

### `<TotalsSummary totalCost linesAdded linesRemoved sessionCount />`

Aggregate banner. Returns `null` when `sessionCount === 0` so it only appears once at least one session has been added. Derives **Net Lines** (`linesAdded - linesRemoved`) inline.

---

## Tests

**11 tests** in `src/utils/parseSession.test.ts`, all targeting the pure `parseSessionOutput` and `formatNumber` functions.

| Suite | Test | Covers |
|---|---|---|
| `parseSessionOutput` | parses total cost | `$2.43` → `2.43` |
| | parses API duration | string preserved verbatim |
| | parses wall duration | string preserved verbatim |
| | parses lines added | comma-separated integer |
| | parses lines removed | comma-separated integer |
| | parses model usage | all six fields of `ModelUsage` |
| | returns zeros for empty input | graceful empty-string handling |
| | handles multiple models | two-model section parsed correctly |
| `formatNumber` | formats millions | `4_200_000` → `"4.2M"` |
| | formats thousands | `35900` → `"35.9k"` |
| | formats small numbers | `571` → `"571"` |

Run a single suite:

```bash
npx jest --testPathPatterns=parseSession
```

---

## Configuration notes

- **Port:** dev server runs on `3000` (set in `vite.config.ts`).
- **Allowed hosts:** `*.cloudfront.net` is whitelisted via `server.allowedHosts` for remote preview environments.
- **TypeScript:** two tsconfigs — `tsconfig.app.json` (strict, bundler-mode, excludes test files) and `tsconfig.test.json` (commonjs, adds `jest` + `node` types for Jest/ts-jest).
- **Linter:** oxlint (`npm run lint`).
