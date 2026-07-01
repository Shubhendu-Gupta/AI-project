# Goal Tracker — Design Spec

**Date:** 2026-07-01  
**Status:** Approved

## Overview

A personal life goal tracking platform for a Software Engineer to track life goals (coding skills, study plans, communication, health, etc.) across devices. Users organize their ambitions into a hierarchy — Life Areas → Goals → Milestones → Daily Tasks — with progress automatically rolling up from tasks to the top level.

---

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS
- **Backend/DB:** Supabase (Postgres, Row Level Security, real-time subscriptions)
- **Auth:** Supabase Google OAuth
- **Data fetching:** React Query (caching, optimistic updates)

Consistent with other apps in this workspace (`/workshop`).

---

## Data Hierarchy

```
Life Areas  (e.g., "Software Engineering", "Communication", "Health")
  └── Goals  (e.g., "Master System Design")
        └── Milestones  (e.g., "Complete Designing Data-Intensive Applications")
              └── Tasks  (e.g., "Read Chapter 3", "Take notes")
```

---

## Database Schema

```sql
life_areas
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     uuid REFERENCES auth.users NOT NULL
  title       text NOT NULL
  description text
  color       text NOT NULL  -- hex color, auto-assigned or user-chosen
  icon        text           -- emoji or icon name
  position    integer        -- display order
  created_at  timestamptz DEFAULT now()
  updated_at  timestamptz DEFAULT now()

goals
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id       uuid REFERENCES auth.users NOT NULL
  life_area_id  uuid REFERENCES life_areas ON DELETE CASCADE NOT NULL
  title         text NOT NULL
  description   text
  status        text NOT NULL DEFAULT 'not_started'  -- not_started | in_progress | completed
  priority      text NOT NULL DEFAULT 'medium'       -- low | medium | high
  due_date      date
  position      integer
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()

milestones
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     uuid REFERENCES auth.users NOT NULL
  goal_id     uuid REFERENCES goals ON DELETE CASCADE NOT NULL
  title       text NOT NULL
  description text
  status      text NOT NULL DEFAULT 'not_started'
  priority    text NOT NULL DEFAULT 'medium'
  due_date    date
  position    integer
  created_at  timestamptz DEFAULT now()
  updated_at  timestamptz DEFAULT now()

tasks
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id       uuid REFERENCES auth.users NOT NULL
  milestone_id  uuid REFERENCES milestones ON DELETE CASCADE NOT NULL
  title         text NOT NULL
  description   text
  status        text NOT NULL DEFAULT 'not_started'
  priority      text NOT NULL DEFAULT 'medium'
  due_date      date
  completed_at  timestamptz
  position      integer
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()
```

**Row Level Security:** All tables enforce `WHERE user_id = auth.uid()` — users only see and modify their own data.

---

## Progress Calculation

Progress is computed client-side and never stored:

- **Task:** 0% (not completed) or 100% (completed)
- **Milestone:** average of its tasks' progress (0% if no tasks)
- **Goal:** average of its milestones' progress (0% if no milestones)
- **Life Area:** average of its goals' progress (0% if no goals)

---

## UI Layout

### Dashboard (main view)

```
┌─────────────────────────────────────────────────────────┐
│  Life Goals Tracker                [+ New Area] [Avatar] │
├─────────────────────────────────────────────────────────┤
│  Today's Focus                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 3 tasks  │  │ 2 tasks  │  │ 1 task   │ ← due today  │
│  │ due today│  │in progress│  │ overdue  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
├─────────────────────────────────────────────────────────┤
│  Life Areas                                              │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Software Eng.    │  │ Communication    │             │
│  │ ████████░░ 78%   │  │ ████░░░░░░ 42%  │             │
│  │ 4 goals · 2 due  │  │ 2 goals · 1 due │             │
│  └──────────────────┘  └──────────────────┘             │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Health & Fitness │  │ Study Plan       │             │
│  │ ██████░░░░ 60%   │  │ ██░░░░░░░░ 20%  │             │
│  └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Slide-out Detail Panel (right side, ~40% width)

Opens when clicking a Life Area card:
- Lists all Goals with progress bars and status badges
- Clicking a Goal expands inline to show its Milestones and Tasks
- Tasks have: checkbox, title, due date, priority badge
- Inline "Add" buttons throughout (no modals)

### Color System

- Each Life Area gets a distinct accent color (auto-assigned from a palette, user can change)
- Status colors: gray = not started, blue = in progress, green = completed, red = overdue

---

## Key Interactions

| Interaction | Behavior |
|---|---|
| Check off a task | Optimistic update; Supabase write in background; progress bubbles up |
| Add goal/milestone/task | Inline form appears in place; Enter to submit, Escape to cancel |
| Edit title | Click any title to edit inline |
| Delete item with children | Single confirmation dialog warning children will be removed |
| Real-time sync | Supabase subscription on `tasks` table; changes reflect instantly across devices |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Failed Supabase write | Toast notification; optimistic update rolled back |
| Auth failure / session expired | Redirect to login page |
| Offline | Read-only mode with banner; writes queue and sync on reconnect |
| Empty life areas | Friendly prompt: "No life areas yet — add your first goal" |
| Empty goals/milestones/tasks | Contextual empty state with inline add prompt |

---

## Auth Flow

1. User lands on `/login` page
2. Clicks "Sign in with Google"
3. Supabase handles OAuth redirect
4. On success, redirected to `/` (dashboard)
5. Session persists via Supabase's built-in session management

---

## Project Structure

```
/workshop/goal-tracker/
  src/
    components/
      dashboard/     -- DashboardStats, LifeAreaCard, LifeAreaGrid
      panel/         -- DetailPanel, GoalItem, MilestoneItem, TaskItem
      common/        -- ProgressBar, StatusBadge, PriorityBadge, InlineForm
      auth/          -- LoginPage, AuthGuard
    hooks/
      useLifeAreas.ts
      useGoals.ts
      useMilestones.ts
      useTasks.ts
      useTodaysFocus.ts
    utils/
      progress.ts    -- progress calculation functions
      colors.ts      -- life area color palette
    types/
      index.ts       -- LifeArea, Goal, Milestone, Task, Status, Priority
    lib/
      supabase.ts    -- Supabase client
  supabase/
    migrations/      -- SQL migration files
```

---

## Testing

- Unit tests for `progress.ts` calculation functions
- Component tests for `TaskItem` checkbox + optimistic update rollback
- Auth flow tested with Supabase test environment

---

## Out of Scope (Phase 2)

- Drag-to-reorder tasks and milestones
- Recurring tasks
- Notifications / reminders
- Mobile app
- Sharing goals with others
- Charts / historical progress graphs
