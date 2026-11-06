export type GoalType = 'checklist' | 'numeric' | 'habit' | 'time'

export interface Profile { id: string; name: string; is_admin: boolean }

export interface Goal {
  id: string
  owner_id: string | null
  title: string
  description: string | null
  category: string | null
  type: GoalType
  target_value: number | null
  unit: string | null
  start_date: string
  due_date: string | null
  status: 'active' | 'done' | 'archived'
  created_at: string
}

export interface GoalItem {
  id: string
  goal_id: string
  text: string
  done: boolean
  completed_at: string | null
  completed_by: string | null
  position: number
}

export interface Entry {
  id: string
  goal_id: string
  user_id: string
  value: number
  note: string | null
  entry_date: string
}

export interface TimeEntry {
  id: string
  goal_id: string | null
  user_id: string
  minutes: number
  note: string | null
  entry_date: string
}

export interface Data {
  profiles: Profile[]
  goals: Goal[]
  items: GoalItem[]
  entries: Entry[]
  times: TimeEntry[]
}
