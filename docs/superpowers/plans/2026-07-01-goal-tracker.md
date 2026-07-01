# Goal Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal life goal tracking platform with a Life Areas → Goals → Milestones → Tasks hierarchy, Google OAuth via Supabase, real-time cross-device sync, and a dashboard with slide-out detail panel.

**Architecture:** Vite/React/TypeScript SPA at `/workshop/goal-tracker/`. Supabase handles Postgres storage, Google OAuth, Row Level Security, and real-time subscriptions on the `tasks` table. React Query manages client-side caching and optimistic updates. Progress (0–100%) is computed client-side by averaging children's completion upward through the hierarchy.

**Tech Stack:** React 19, TypeScript 5.6, Vite 5, Tailwind CSS 3, Supabase JS v2, TanStack React Query v5, Vitest + Testing Library

## Global Constraints

- Port 3000, `server.allowedHosts: ['.cloudfront.net']` in vite config
- Vitest with jsdom environment; `globals: true`; setupFiles `./src/setupTests.ts`
- Strict TypeScript (`"strict": true`)
- All Supabase tables have `user_id uuid` with RLS: `WHERE user_id = auth.uid()`
- Status values: `'not_started' | 'in_progress' | 'completed'`
- Priority values: `'low' | 'medium' | 'high'`
- Progress is never stored — always computed from children
- No modals — all add/edit interactions are inline
- Optimistic updates must be rolled back on Supabase error with a toast

---

## File Map

```
goal-tracker/
  package.json
  vite.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  tailwind.config.js
  postcss.config.js
  index.html
  src/
    main.tsx
    App.tsx
    App.test.tsx
    setupTests.ts
    vite-env.d.ts
    index.css
    types/
      index.ts                    ← LifeArea, Goal, Milestone, Task + Status/Priority types
    lib/
      supabase.ts                 ← Supabase client singleton
    utils/
      progress.ts                 ← calcTaskProgress, calcMilestoneProgress, calcGoalProgress, calcAreaProgress
      progress.test.ts
      colors.ts                   ← AREA_COLORS palette + getAreaColor(index)
    hooks/
      useLifeAreas.ts             ← CRUD + React Query for life_areas
      useGoals.ts                 ← CRUD + React Query for goals
      useMilestones.ts            ← CRUD + React Query for milestones
      useTasks.ts                 ← CRUD + optimistic toggle + real-time subscription
      useTodaysFocus.ts           ← derive today/in-progress/overdue task counts
    components/
      auth/
        LoginPage.tsx             ← Google OAuth sign-in screen
        AuthGuard.tsx             ← redirects unauthenticated users to /login
      common/
        ProgressBar.tsx           ← colored progress bar (0–100)
        StatusBadge.tsx           ← pill badge for status values
        PriorityBadge.tsx         ← pill badge for priority values
        InlineForm.tsx            ← single-field inline add/edit form
        Toast.tsx                 ← error/success notification
        ToastProvider.tsx         ← context + useToast hook
      dashboard/
        DashboardStats.tsx        ← Today's Focus stat cards (due today / in-progress / overdue)
        LifeAreaCard.tsx          ← single area card with progress bar + goal count
        LifeAreaGrid.tsx          ← responsive grid of LifeAreaCards + empty state
      panel/
        DetailPanel.tsx           ← slide-out right panel, controlled by selectedAreaId
        GoalItem.tsx              ← collapsible goal row with milestones inside
        MilestoneItem.tsx         ← collapsible milestone row with tasks inside
        TaskItem.tsx              ← task row with checkbox, title, due date, priority
```

---

### Task 1: Scaffold project + Tailwind + Supabase client

**Files:**
- Create: `goal-tracker/package.json`
- Create: `goal-tracker/vite.config.ts`
- Create: `goal-tracker/tsconfig.json`
- Create: `goal-tracker/tsconfig.app.json`
- Create: `goal-tracker/tsconfig.node.json`
- Create: `goal-tracker/tailwind.config.js`
- Create: `goal-tracker/postcss.config.js`
- Create: `goal-tracker/index.html`
- Create: `goal-tracker/src/vite-env.d.ts`
- Create: `goal-tracker/src/index.css`
- Create: `goal-tracker/src/main.tsx`
- Create: `goal-tracker/src/setupTests.ts`
- Create: `goal-tracker/src/lib/supabase.ts`
- Create: `goal-tracker/.env.example`

**Interfaces:**
- Produces: `supabase` client exported from `src/lib/supabase.ts` — `SupabaseClient` from `@supabase/supabase-js`

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /workshop
npm create vite@latest goal-tracker -- --template react-ts
cd goal-tracker
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Configure vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ['.cloudfront.net'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Configure tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: Replace src/index.css with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create src/setupTests.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Add vitest and testing-library to devDependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/node
```

- [ ] **Step 8: Update package.json scripts**

In `package.json`, replace the `scripts` block:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 9: Create .env.example**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Also create `.env.local` from this template (fill in real values from your Supabase project dashboard).

- [ ] **Step 10: Create src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 11: Create src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 12: Verify project builds**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 13: Commit**

```bash
git add goal-tracker/
git commit -m "feat(goal-tracker): scaffold Vite + React + Tailwind + Supabase client"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `goal-tracker/src/types/index.ts`

**Interfaces:**
- Produces: `LifeArea`, `Goal`, `Milestone`, `Task`, `Status`, `Priority` — exported from `src/types/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

```ts
export type Status = 'not_started' | 'in_progress' | 'completed'
export type Priority = 'low' | 'medium' | 'high'

export interface LifeArea {
  id: string
  user_id: string
  title: string
  description: string | null
  color: string
  icon: string | null
  position: number | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  life_area_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  due_date: string | null
  position: number | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  user_id: string
  goal_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  due_date: string | null
  position: number | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  milestone_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  due_date: string | null
  completed_at: string | null
  position: number | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add goal-tracker/src/types/
git commit -m "feat(goal-tracker): add TypeScript types for data hierarchy"
```

---

### Task 3: Supabase database migrations

**Files:**
- Create: `goal-tracker/supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: Supabase tables `life_areas`, `goals`, `milestones`, `tasks` with RLS

- [ ] **Step 1: Create the migration file**

```bash
mkdir -p goal-tracker/supabase/migrations
```

Create `goal-tracker/supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Life Areas
create table life_areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  color       text not null,
  icon        text,
  position    integer,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table life_areas enable row level security;
create policy "Users see own life_areas" on life_areas
  for all using (auth.uid() = user_id);

-- Goals
create table goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  life_area_id  uuid references life_areas on delete cascade not null,
  title         text not null,
  description   text,
  status        text not null default 'not_started',
  priority      text not null default 'medium',
  due_date      date,
  position      integer,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table goals enable row level security;
create policy "Users see own goals" on goals
  for all using (auth.uid() = user_id);

-- Milestones
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  goal_id     uuid references goals on delete cascade not null,
  title       text not null,
  description text,
  status      text not null default 'not_started',
  priority    text not null default 'medium',
  due_date    date,
  position    integer,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table milestones enable row level security;
create policy "Users see own milestones" on milestones
  for all using (auth.uid() = user_id);

-- Tasks
create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  milestone_id  uuid references milestones on delete cascade not null,
  title         text not null,
  description   text,
  status        text not null default 'not_started',
  priority      text not null default 'medium',
  due_date      date,
  completed_at  timestamptz,
  position      integer,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users see own tasks" on tasks
  for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Run in Supabase**

Go to your Supabase project dashboard → SQL Editor → paste and run the migration.

Expected: all 4 tables created with RLS enabled.

- [ ] **Step 3: Enable Google OAuth in Supabase**

In Supabase dashboard → Authentication → Providers → Google → toggle on. Add your Google OAuth Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com). Add `http://localhost:3000` to Redirect URLs.

- [ ] **Step 4: Commit**

```bash
git add goal-tracker/supabase/
git commit -m "feat(goal-tracker): add Supabase migration — 4 tables with RLS"
```

---

### Task 4: Progress utilities

**Files:**
- Create: `goal-tracker/src/utils/progress.ts`
- Create: `goal-tracker/src/utils/progress.test.ts`
- Create: `goal-tracker/src/utils/colors.ts`

**Interfaces:**
- Consumes: `Task`, `Milestone`, `Goal`, `LifeArea` from `src/types/index.ts`
- Produces:
  - `calcTaskProgress(task: Task): number` — 0 or 100
  - `calcMilestoneProgress(tasks: Task[]): number` — 0–100
  - `calcGoalProgress(milestones: Milestone[], tasksByMilestone: Record<string, Task[]>): number` — 0–100
  - `calcAreaProgress(goals: Goal[], milestonesByGoal: Record<string, Milestone[]>, tasksByMilestone: Record<string, Task[]>): number` — 0–100
  - `AREA_COLORS: string[]` — array of hex colors
  - `getAreaColor(index: number): string` — cycles through AREA_COLORS

- [ ] **Step 1: Write failing tests first**

Create `goal-tracker/src/utils/progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  calcTaskProgress,
  calcMilestoneProgress,
  calcGoalProgress,
  calcAreaProgress,
} from './progress'
import type { Task, Milestone, Goal } from '../types'

const makeTask = (status: Task['status']): Task => ({
  id: '1', user_id: 'u', milestone_id: 'm',
  title: 'T', description: null,
  status, priority: 'medium', due_date: null,
  completed_at: status === 'completed' ? '2026-01-01T00:00:00Z' : null,
  position: null, created_at: '', updated_at: '',
})

const makeMilestone = (id: string): Milestone => ({
  id, user_id: 'u', goal_id: 'g',
  title: 'M', description: null,
  status: 'not_started', priority: 'medium',
  due_date: null, position: null, created_at: '', updated_at: '',
})

const makeGoal = (id: string): Goal => ({
  id, user_id: 'u', life_area_id: 'a',
  title: 'G', description: null,
  status: 'not_started', priority: 'medium',
  due_date: null, position: null, created_at: '', updated_at: '',
})

describe('calcTaskProgress', () => {
  it('returns 100 for completed tasks', () => {
    expect(calcTaskProgress(makeTask('completed'))).toBe(100)
  })
  it('returns 0 for not_started tasks', () => {
    expect(calcTaskProgress(makeTask('not_started'))).toBe(0)
  })
  it('returns 0 for in_progress tasks', () => {
    expect(calcTaskProgress(makeTask('in_progress'))).toBe(0)
  })
})

describe('calcMilestoneProgress', () => {
  it('returns 0 with no tasks', () => {
    expect(calcMilestoneProgress([])).toBe(0)
  })
  it('returns 50 when half tasks completed', () => {
    expect(calcMilestoneProgress([makeTask('completed'), makeTask('not_started')])).toBe(50)
  })
  it('returns 100 when all tasks completed', () => {
    expect(calcMilestoneProgress([makeTask('completed'), makeTask('completed')])).toBe(100)
  })
})

describe('calcGoalProgress', () => {
  it('returns 0 with no milestones', () => {
    expect(calcGoalProgress([], {})).toBe(0)
  })
  it('averages milestone progress', () => {
    const m1 = makeMilestone('m1')
    const m2 = makeMilestone('m2')
    const tasksByMilestone = {
      m1: [makeTask('completed')],
      m2: [makeTask('not_started')],
    }
    expect(calcGoalProgress([m1, m2], tasksByMilestone)).toBe(50)
  })
})

describe('calcAreaProgress', () => {
  it('returns 0 with no goals', () => {
    expect(calcAreaProgress([], {}, {})).toBe(0)
  })
  it('averages goal progress', () => {
    const g1 = makeGoal('g1')
    const g2 = makeGoal('g2')
    const m1 = makeMilestone('m1')
    const m2 = makeMilestone('m2')
    const milestonesByGoal = { g1: [m1], g2: [m2] }
    const tasksByMilestone = {
      m1: [makeTask('completed')],
      m2: [makeTask('not_started')],
    }
    expect(calcAreaProgress([g1, g2], milestonesByGoal, tasksByMilestone)).toBe(50)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd goal-tracker && npm test -- progress
```
Expected: FAIL — `calcTaskProgress` not found.

- [ ] **Step 3: Implement progress.ts**

Create `goal-tracker/src/utils/progress.ts`:

```ts
import type { Task, Milestone, Goal } from '../types'

export const calcTaskProgress = (task: Task): number =>
  task.status === 'completed' ? 100 : 0

export const calcMilestoneProgress = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + calcTaskProgress(t), 0)
  return sum / tasks.length
}

export const calcGoalProgress = (
  milestones: Milestone[],
  tasksByMilestone: Record<string, Task[]>
): number => {
  if (milestones.length === 0) return 0
  const sum = milestones.reduce(
    (acc, m) => acc + calcMilestoneProgress(tasksByMilestone[m.id] ?? []),
    0
  )
  return sum / milestones.length
}

export const calcAreaProgress = (
  goals: Goal[],
  milestonesByGoal: Record<string, Milestone[]>,
  tasksByMilestone: Record<string, Task[]>
): number => {
  if (goals.length === 0) return 0
  const sum = goals.reduce(
    (acc, g) =>
      acc + calcGoalProgress(milestonesByGoal[g.id] ?? [], tasksByMilestone),
    0
  )
  return sum / goals.length
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- progress
```
Expected: all 9 tests PASS.

- [ ] **Step 5: Create colors.ts**

```ts
export const AREA_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#14b8a6', // teal
]

export const getAreaColor = (index: number): string =>
  AREA_COLORS[index % AREA_COLORS.length]
```

- [ ] **Step 6: Commit**

```bash
git add goal-tracker/src/utils/
git commit -m "feat(goal-tracker): add progress calculation utilities and color palette"
```

---

### Task 5: Toast notification system

**Files:**
- Create: `goal-tracker/src/components/common/Toast.tsx`
- Create: `goal-tracker/src/components/common/ToastProvider.tsx`

**Interfaces:**
- Produces:
  - `ToastProvider` component — wraps app, provides toast context
  - `useToast(): { showToast: (message: string, type: 'success' | 'error') => void }` — exported from `ToastProvider.tsx`

- [ ] **Step 1: Create ToastProvider.tsx**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  showToast: (message: string, type: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg text-white text-sm shadow-lg transition-all ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 2: Create Toast.tsx (re-export for convenience)**

```tsx
export { ToastProvider, useToast } from './ToastProvider'
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add goal-tracker/src/components/
git commit -m "feat(goal-tracker): add ToastProvider and useToast hook"
```

---

### Task 6: Common UI components

**Files:**
- Create: `goal-tracker/src/components/common/ProgressBar.tsx`
- Create: `goal-tracker/src/components/common/StatusBadge.tsx`
- Create: `goal-tracker/src/components/common/PriorityBadge.tsx`
- Create: `goal-tracker/src/components/common/InlineForm.tsx`

**Interfaces:**
- Consumes: `Status`, `Priority` from `src/types/index.ts`
- Produces:
  - `ProgressBar({ value: number, color: string, className?: string })`
  - `StatusBadge({ status: Status })`
  - `PriorityBadge({ priority: Priority })`
  - `InlineForm({ onSubmit: (title: string) => void, onCancel: () => void, placeholder?: string })`

- [ ] **Step 1: Create ProgressBar.tsx**

```tsx
interface Props {
  value: number
  color: string
  className?: string
}

export const ProgressBar = ({ value, color, className = '' }: Props) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
    />
  </div>
)
```

- [ ] **Step 2: Create StatusBadge.tsx**

```tsx
import type { Status } from '../../types'

const STATUS_STYLES: Record<Status, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
)
```

- [ ] **Step 3: Create PriorityBadge.tsx**

```tsx
import type { Priority } from '../../types'

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-600',
}

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[priority]}`}>
    {priority}
  </span>
)
```

- [ ] **Step 4: Create InlineForm.tsx**

```tsx
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface Props {
  onSubmit: (title: string) => void
  onCancel: () => void
  placeholder?: string
}

export const InlineForm = ({ onSubmit, onCancel, placeholder = 'Add title…' }: Props) => {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      placeholder={placeholder}
      className="w-full text-sm border border-indigo-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400"
    />
  )
}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add goal-tracker/src/components/common/
git commit -m "feat(goal-tracker): add ProgressBar, StatusBadge, PriorityBadge, InlineForm components"
```

---

### Task 7: Auth — LoginPage + AuthGuard

**Files:**
- Create: `goal-tracker/src/components/auth/LoginPage.tsx`
- Create: `goal-tracker/src/components/auth/AuthGuard.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`
- Produces:
  - `LoginPage` — renders Google sign-in button, calls `supabase.auth.signInWithOAuth`
  - `AuthGuard({ children: ReactNode })` — renders children if session exists, else renders `<LoginPage />`

- [ ] **Step 1: Create LoginPage.tsx**

```tsx
import { supabase } from '../../lib/supabase'

export const LoginPage = () => {
  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-4xl">🎯</div>
        <h1 className="text-2xl font-bold text-gray-900">Life Goals Tracker</h1>
        <p className="text-gray-500 text-sm text-center">
          Track your goals, milestones, and daily tasks — synced across all your devices.
        </p>
        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create AuthGuard.tsx**

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { LoginPage } from './LoginPage'

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <LoginPage />

  return <>{children}</>
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add goal-tracker/src/components/auth/
git commit -m "feat(goal-tracker): add LoginPage and AuthGuard with Google OAuth"
```

---

### Task 8: Data hooks — useLifeAreas, useGoals, useMilestones

**Files:**
- Create: `goal-tracker/src/hooks/useLifeAreas.ts`
- Create: `goal-tracker/src/hooks/useGoals.ts`
- Create: `goal-tracker/src/hooks/useMilestones.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`; `LifeArea`, `Goal`, `Milestone` from `src/types/index.ts`; `getAreaColor` from `src/utils/colors.ts`
- Produces:
  - `useLifeAreas(): { lifeAreas: LifeArea[], addLifeArea: (title: string) => void, deleteLifeArea: (id: string) => void, isLoading: boolean }`
  - `useGoals(lifeAreaId: string): { goals: Goal[], addGoal: (title: string) => void, deleteGoal: (id: string) => void }`
  - `useMilestones(goalId: string): { milestones: Milestone[], addMilestone: (title: string) => void, deleteMilestone: (id: string) => void }`

- [ ] **Step 1: Create useLifeAreas.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LifeArea } from '../types'
import { getAreaColor } from '../utils/colors'

const fetchLifeAreas = async (): Promise<LifeArea[]> => {
  const { data, error } = await supabase
    .from('life_areas')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const useLifeAreas = () => {
  const qc = useQueryClient()

  const { data: lifeAreas = [], isLoading } = useQuery({
    queryKey: ['life_areas'],
    queryFn: fetchLifeAreas,
  })

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('life_areas').insert({
        title,
        color: getAreaColor(lifeAreas.length),
        user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life_areas'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('life_areas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life_areas'] }),
  })

  return {
    lifeAreas,
    isLoading,
    addLifeArea: addMutation.mutate,
    deleteLifeArea: deleteMutation.mutate,
  }
}
```

- [ ] **Step 2: Create useGoals.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

const fetchGoals = async (lifeAreaId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('life_area_id', lifeAreaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const useGoals = (lifeAreaId: string) => {
  const qc = useQueryClient()

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', lifeAreaId],
    queryFn: () => fetchGoals(lifeAreaId),
    enabled: !!lifeAreaId,
  })

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('goals').insert({
        title, life_area_id: lifeAreaId, user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', lifeAreaId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', lifeAreaId] }),
  })

  return {
    goals,
    addGoal: addMutation.mutate,
    deleteGoal: deleteMutation.mutate,
  }
}
```

- [ ] **Step 3: Create useMilestones.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Milestone } from '../types'

const fetchMilestones = async (goalId: string): Promise<Milestone[]> => {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const useMilestones = (goalId: string) => {
  const qc = useQueryClient()

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', goalId],
    queryFn: () => fetchMilestones(goalId),
    enabled: !!goalId,
  })

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('milestones').insert({
        title, goal_id: goalId, user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', goalId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', goalId] }),
  })

  return {
    milestones,
    addMilestone: addMutation.mutate,
    deleteMilestone: deleteMutation.mutate,
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add goal-tracker/src/hooks/
git commit -m "feat(goal-tracker): add useLifeAreas, useGoals, useMilestones hooks"
```

---

### Task 9: useTasks hook with optimistic updates + real-time

**Files:**
- Create: `goal-tracker/src/hooks/useTasks.ts`
- Create: `goal-tracker/src/hooks/useTodaysFocus.ts`

**Interfaces:**
- Consumes: `supabase`, `Task`, `useToast`
- Produces:
  - `useTasks(milestoneId: string): { tasks: Task[], addTask: (title: string) => void, toggleTask: (task: Task) => void, deleteTask: (id: string) => void }`
  - `useTodaysFocus(lifeAreas: LifeArea[]): { dueToday: number, inProgress: number, overdue: number }`

- [ ] **Step 1: Create useTasks.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/common/Toast'
import type { Task } from '../types'

const fetchTasks = async (milestoneId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const useTasks = (milestoneId: string) => {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const queryKey = ['tasks', milestoneId]

  const { data: tasks = [] } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(milestoneId),
    enabled: !!milestoneId,
  })

  // Real-time subscription
  useEffect(() => {
    if (!milestoneId) return
    const channel = supabase
      .channel(`tasks:${milestoneId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `milestone_id=eq.${milestoneId}`,
      }, () => {
        qc.invalidateQueries({ queryKey })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [milestoneId, qc])

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tasks').insert({
        title, milestone_id: milestoneId, user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: () => showToast('Failed to add task', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === 'completed' ? 'not_started' : 'completed'
      const { error } = await supabase.from('tasks').update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      }).eq('id', task.id)
      if (error) throw error
    },
    onMutate: async (task: Task) => {
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData<Task[]>(queryKey)
      qc.setQueryData<Task[]>(queryKey, old =>
        old?.map(t => t.id === task.id
          ? { ...t, status: t.status === 'completed' ? 'not_started' : 'completed' }
          : t
        ) ?? []
      )
      return { previous }
    },
    onError: (_err, _task, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous)
      showToast('Failed to update task', 'error')
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: () => showToast('Failed to delete task', 'error'),
  })

  return {
    tasks,
    addTask: addMutation.mutate,
    toggleTask: toggleMutation.mutate,
    deleteTask: deleteMutation.mutate,
  }
}
```

- [ ] **Step 2: Create useTodaysFocus.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface TodaysFocus {
  dueToday: number
  inProgress: number
  overdue: number
}

export const useTodaysFocus = (): TodaysFocus => {
  const today = new Date().toISOString().split('T')[0]

  const { data } = useQuery({
    queryKey: ['todays_focus', today],
    queryFn: async (): Promise<TodaysFocus> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status, due_date')
      if (error) throw error
      const tasks = data ?? []
      return {
        dueToday: tasks.filter(t => t.due_date === today && t.status !== 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length,
      }
    },
  })

  return data ?? { dueToday: 0, inProgress: 0, overdue: 0 }
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add goal-tracker/src/hooks/
git commit -m "feat(goal-tracker): add useTasks with optimistic updates, real-time sync, and useTodaysFocus"
```

---

### Task 10: Dashboard components

**Files:**
- Create: `goal-tracker/src/components/dashboard/DashboardStats.tsx`
- Create: `goal-tracker/src/components/dashboard/LifeAreaCard.tsx`
- Create: `goal-tracker/src/components/dashboard/LifeAreaGrid.tsx`

**Interfaces:**
- Consumes: `LifeArea`, `Goal` from types; `ProgressBar` from common; `calcAreaProgress`, `calcGoalProgress` from utils; `useGoals`, `useMilestones`, `useTasks`, `useTodaysFocus` from hooks
- Produces:
  - `DashboardStats` — renders 3 stat cards (due today / in progress / overdue)
  - `LifeAreaCard({ area: LifeArea, isSelected: boolean, onClick: () => void })` — card with progress bar
  - `LifeAreaGrid({ areas: LifeArea[], selectedId: string | null, onSelect: (id: string) => void, onAdd: () => void })` — grid + empty state

- [ ] **Step 1: Create DashboardStats.tsx**

```tsx
import { useTodaysFocus } from '../../hooks/useTodaysFocus'

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`rounded-xl p-4 flex flex-col gap-1 ${color}`}>
    <span className="text-2xl font-bold">{value}</span>
    <span className="text-sm opacity-80">{label}</span>
  </div>
)

export const DashboardStats = () => {
  const { dueToday, inProgress, overdue } = useTodaysFocus()
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Today's Focus
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Due Today" value={dueToday} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="In Progress" value={inProgress} color="bg-blue-50 text-blue-700" />
        <StatCard label="Overdue" value={overdue} color="bg-red-50 text-red-600" />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create LifeAreaCard.tsx**

```tsx
import type { LifeArea } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { useGoals } from '../../hooks/useGoals'

interface Props {
  area: LifeArea
  isSelected: boolean
  onClick: () => void
}

export const LifeAreaCard = ({ area, isSelected, onClick }: Props) => {
  const { goals } = useGoals(area.id)
  const dueCount = goals.filter(g => g.due_date).length

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border-2 transition-all hover:shadow-md ${
        isSelected ? 'border-opacity-100 shadow-md' : 'border-gray-100 hover:border-opacity-50'
      }`}
      style={{ borderColor: isSelected ? area.color : undefined }}
    >
      <div className="flex items-center gap-2 mb-3">
        {area.icon && <span className="text-xl">{area.icon}</span>}
        <span className="font-semibold text-gray-900 truncate">{area.title}</span>
      </div>
      <ProgressBar value={goals.length === 0 ? 0 : (goals.filter(g => g.status === 'completed').length / goals.length) * 100} color={area.color} className="mb-2" />
      <div className="text-xs text-gray-500">
        {goals.length} goal{goals.length !== 1 ? 's' : ''}
        {dueCount > 0 && ` · ${dueCount} with due dates`}
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Create LifeAreaGrid.tsx**

```tsx
import { useState } from 'react'
import type { LifeArea } from '../../types'
import { LifeAreaCard } from './LifeAreaCard'
import { InlineForm } from '../common/InlineForm'

interface Props {
  areas: LifeArea[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (title: string) => void
}

export const LifeAreaGrid = ({ areas, selectedId, onSelect, onAdd }: Props) => {
  const [adding, setAdding] = useState(false)

  if (areas.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-4">🎯</div>
        <p className="text-lg font-medium text-gray-600 mb-1">No life areas yet</p>
        <p className="text-sm mb-4">Start by adding your first goal category</p>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          + Add Life Area
        </button>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Life Areas</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
          >
            + New Area
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {areas.map(area => (
          <LifeAreaCard
            key={area.id}
            area={area}
            isSelected={selectedId === area.id}
            onClick={() => onSelect(area.id)}
          />
        ))}
        {adding && (
          <div className="rounded-xl border-2 border-dashed border-indigo-300 p-4">
            <InlineForm
              onSubmit={title => { onAdd(title); setAdding(false) }}
              onCancel={() => setAdding(false)}
              placeholder="Life area name (e.g. Software Engineering)"
            />
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add goal-tracker/src/components/dashboard/
git commit -m "feat(goal-tracker): add DashboardStats, LifeAreaCard, LifeAreaGrid components"
```

---

### Task 11: Detail panel components

**Files:**
- Create: `goal-tracker/src/components/panel/TaskItem.tsx`
- Create: `goal-tracker/src/components/panel/MilestoneItem.tsx`
- Create: `goal-tracker/src/components/panel/GoalItem.tsx`
- Create: `goal-tracker/src/components/panel/DetailPanel.tsx`

**Interfaces:**
- Consumes: `Task`, `Milestone`, `Goal`, `LifeArea` from types; all hooks; all common components
- Produces:
  - `TaskItem({ task: Task, onToggle: (task: Task) => void, onDelete: (id: string) => void })`
  - `MilestoneItem({ milestone: Milestone })` — fetches own tasks
  - `GoalItem({ goal: Goal })` — fetches own milestones
  - `DetailPanel({ area: LifeArea | null, onClose: () => void })` — slide-out panel

- [ ] **Step 1: Create TaskItem.tsx**

```tsx
import type { Task } from '../../types'
import { PriorityBadge } from '../common/PriorityBadge'

interface Props {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
}

export const TaskItem = ({ task, onToggle, onDelete }: Props) => {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && !isCompleted

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onToggle(task)}
        className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400 cursor-pointer flex-shrink-0"
      />
      <span className={`flex-1 text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {task.title}
      </span>
      {task.due_date && (
        <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {task.due_date}
        </span>
      )}
      <PriorityBadge priority={task.priority} />
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create MilestoneItem.tsx**

```tsx
import { useState } from 'react'
import type { Milestone } from '../../types'
import { useTasks } from '../../hooks/useTasks'
import { StatusBadge } from '../common/StatusBadge'
import { ProgressBar } from '../common/ProgressBar'
import { InlineForm } from '../common/InlineForm'
import { TaskItem } from './TaskItem'
import { calcMilestoneProgress } from '../../utils/progress'

export const MilestoneItem = ({ milestone }: { milestone: Milestone }) => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks(milestone.id)
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const progress = calcMilestoneProgress(tasks)

  return (
    <div className="ml-4 border-l-2 border-gray-100 pl-3 py-1">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-1"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
        <span className="text-sm font-medium text-gray-700 flex-1">{milestone.title}</span>
        <StatusBadge status={milestone.status} />
        <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
      </div>
      {expanded && (
        <div className="mt-1 ml-4">
          <ProgressBar value={progress} color="#6366f1" className="mb-2" />
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
          {adding ? (
            <InlineForm
              onSubmit={title => { addTask(title); setAdding(false) }}
              onCancel={() => setAdding(false)}
              placeholder="Task name…"
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-indigo-400 hover:text-indigo-600 mt-1"
            >
              + Add task
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create GoalItem.tsx**

```tsx
import { useState } from 'react'
import type { Goal } from '../../types'
import { useMilestones } from '../../hooks/useMilestones'
import { StatusBadge } from '../common/StatusBadge'
import { PriorityBadge } from '../common/PriorityBadge'
import { InlineForm } from '../common/InlineForm'
import { MilestoneItem } from './MilestoneItem'

export const GoalItem = ({ goal }: { goal: Goal }) => {
  const { milestones, addMilestone } = useMilestones(goal.id)
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)

  return (
    <div className="border border-gray-100 rounded-lg mb-2 overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
        <span className="font-medium text-gray-800 flex-1">{goal.title}</span>
        <PriorityBadge priority={goal.priority} />
        <StatusBadge status={goal.status} />
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-50">
          {milestones.map(m => <MilestoneItem key={m.id} milestone={m} />)}
          {adding ? (
            <InlineForm
              onSubmit={title => { addMilestone(title); setAdding(false) }}
              onCancel={() => setAdding(false)}
              placeholder="Milestone name…"
            />
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setAdding(true) }}
              className="text-xs text-indigo-400 hover:text-indigo-600 mt-2 ml-4"
            >
              + Add milestone
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create DetailPanel.tsx**

```tsx
import { useState } from 'react'
import type { LifeArea } from '../../types'
import { useGoals } from '../../hooks/useGoals'
import { InlineForm } from '../common/InlineForm'
import { GoalItem } from './GoalItem'

interface Props {
  area: LifeArea | null
  onClose: () => void
}

export const DetailPanel = ({ area, onClose }: Props) => {
  const { goals, addGoal } = useGoals(area?.id ?? '')
  const [addingGoal, setAddingGoal] = useState(false)

  if (!area) return null

  return (
    <aside className="fixed right-0 top-0 h-full w-[40%] bg-white border-l border-gray-200 shadow-xl flex flex-col z-40">
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
        style={{ borderLeftColor: area.color, borderLeftWidth: 4 }}
      >
        {area.icon && <span className="text-2xl">{area.icon}</span>}
        <h2 className="text-lg font-bold text-gray-900 flex-1">{area.title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {goals.length === 0 && !addingGoal && (
          <p className="text-sm text-gray-400 text-center py-8">No goals yet — add your first one below</p>
        )}
        {goals.map(goal => <GoalItem key={goal.id} goal={goal} />)}
        {addingGoal ? (
          <InlineForm
            onSubmit={title => { addGoal(title); setAddingGoal(false) }}
            onCancel={() => setAddingGoal(false)}
            placeholder="Goal name…"
          />
        ) : (
          <button
            onClick={() => setAddingGoal(true)}
            className="mt-3 text-sm text-indigo-500 hover:text-indigo-700 font-medium"
          >
            + Add Goal
          </button>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add goal-tracker/src/components/panel/
git commit -m "feat(goal-tracker): add TaskItem, MilestoneItem, GoalItem, DetailPanel components"
```

---

### Task 12: Wire App.tsx and main.tsx

**Files:**
- Modify: `goal-tracker/src/App.tsx`
- Modify: `goal-tracker/src/main.tsx`

**Interfaces:**
- Consumes: all hooks, components, providers
- Produces: runnable app at `http://localhost:3000`

- [ ] **Step 1: Update main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/common/ToastProvider'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 2: Update App.tsx**

```tsx
import { useState } from 'react'
import { AuthGuard } from './components/auth/AuthGuard'
import { DashboardStats } from './components/dashboard/DashboardStats'
import { LifeAreaGrid } from './components/dashboard/LifeAreaGrid'
import { DetailPanel } from './components/panel/DetailPanel'
import { useLifeAreas } from './hooks/useLifeAreas'
import { supabase } from './lib/supabase'

const Dashboard = () => {
  const { lifeAreas, addLifeArea, isLoading } = useLifeAreas()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedArea = lifeAreas.find(a => a.id === selectedId) ?? null

  const handleSelect = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🎯 Life Goals Tracker</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </header>
      <main className={`px-6 py-6 max-w-5xl mx-auto transition-all ${selectedArea ? 'pr-[42%]' : ''}`}>
        <div className="flex flex-col gap-6">
          <DashboardStats />
          <LifeAreaGrid
            areas={lifeAreas}
            selectedId={selectedId}
            onSelect={handleSelect}
            onAdd={addLifeArea}
          />
        </div>
      </main>
      <DetailPanel area={selectedArea} onClose={() => setSelectedId(null)} />
    </div>
  )
}

export default function App() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
```

- [ ] **Step 3: Run the app**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Sign in with Google works and redirects to the dashboard
- "Today's Focus" stats show
- "+ New Area" creates a life area card inline
- Clicking a card opens the slide-out panel on the right
- Goals, milestones, tasks can be added inline
- Checking a task updates the checkbox instantly (optimistic) and syncs to Supabase

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add goal-tracker/src/App.tsx goal-tracker/src/main.tsx
git commit -m "feat(goal-tracker): wire App and main — full dashboard with auth and detail panel"
```

---

### Task 13: TaskItem component test

**Files:**
- Create: `goal-tracker/src/components/panel/TaskItem.test.tsx`

**Interfaces:**
- Consumes: `TaskItem` from `./TaskItem`; `ToastProvider` from common

- [ ] **Step 1: Write the failing test**

Create `goal-tracker/src/components/panel/TaskItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskItem } from './TaskItem'
import type { Task } from '../../types'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  user_id: 'user-1',
  milestone_id: 'ms-1',
  title: 'Read Chapter 3',
  description: null,
  status: 'not_started',
  priority: 'medium',
  due_date: null,
  completed_at: null,
  position: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
})

describe('TaskItem', () => {
  it('renders task title', () => {
    render(<TaskItem task={makeTask()} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Read Chapter 3')).toBeInTheDocument()
  })

  it('shows checkbox unchecked for not_started task', () => {
    render(<TaskItem task={makeTask()} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('shows checkbox checked for completed task', () => {
    render(<TaskItem task={makeTask({ status: 'completed' })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onToggle when checkbox is clicked', async () => {
    const onToggle = vi.fn()
    const task = makeTask()
    render(<TaskItem task={task} onToggle={onToggle} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith(task)
  })

  it('shows line-through styling for completed tasks', () => {
    render(<TaskItem task={makeTask({ status: 'completed' })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const titleEl = screen.getByText('Read Chapter 3')
    expect(titleEl).toHaveClass('line-through')
  })

  it('shows overdue date in red when task is overdue', () => {
    render(
      <TaskItem
        task={makeTask({ due_date: '2020-01-01', status: 'not_started' })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const dateEl = screen.getByText('2020-01-01')
    expect(dateEl).toHaveClass('text-red-500')
  })
})
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npm test -- TaskItem
```
Expected: all 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add goal-tracker/src/components/panel/TaskItem.test.tsx
git commit -m "test(goal-tracker): add TaskItem component tests"
```

---

### Task 14: Final typecheck, lint, and build verification

**Files:** none created

- [ ] **Step 1: Run full typecheck**

```bash
cd goal-tracker && npm run typecheck
```
Expected: no errors.

- [ ] **Step 2: Run all tests**

```bash
npm test
```
Expected: all tests pass (progress utils + TaskItem).

- [ ] **Step 3: Run production build**

```bash
npm run build
```
Expected: build succeeds, no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(goal-tracker): verify build, types, and tests all pass"
```
