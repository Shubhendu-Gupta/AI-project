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
