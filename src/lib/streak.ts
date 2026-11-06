import type { Data } from '../types'
import { addDays, todayStr } from './dates'

export interface Streak { current: number; best: number; activeToday: boolean }

/** Consecutive-day streak from a set of YYYY-MM-DD dates.
 *  Current streak stays alive if you were active yesterday but haven't logged yet today. */
export function computeStreak(dates: Set<string>): Streak {
  const today = todayStr()
  const activeToday = dates.has(today)
  let cursor = activeToday ? today : addDays(today, -1)
  let current = 0
  while (dates.has(cursor)) { current++; cursor = addDays(cursor, -1) }

  const sorted = [...dates].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best, activeToday }
}

/** Any activity by this user counts: progress logs, habit check-ins, time logged, checklist items ticked. */
export function activityDates(userId: string, data: Data): Set<string> {
  const s = new Set<string>()
  for (const e of data.entries) if (e.user_id === userId) s.add(e.entry_date)
  for (const t of data.times) if (t.user_id === userId) s.add(t.entry_date)
  for (const i of data.items) {
    if (i.done && i.completed_by === userId && i.completed_at) s.add(i.completed_at.slice(0, 10))
  }
  return s
}

/** Streak for a single habit goal (check-ins by anyone on the goal, or only `userId` if given). */
export function habitStreak(goalId: string, data: Data, userId?: string): Streak {
  const s = new Set<string>()
  for (const e of data.entries) {
    if (e.goal_id === goalId && (!userId || e.user_id === userId)) s.add(e.entry_date)
  }
  return computeStreak(s)
}
