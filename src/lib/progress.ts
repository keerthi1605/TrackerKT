import type { Data, Entry, Goal, TimeEntry } from '../types'
import { diffDays, todayStr } from './dates'

export interface Progress { pct: number; current: number; target: number | null; label: string }
export type Pace = 'ahead' | 'ontrack' | 'behind' | 'none'

const num = (v: unknown) => Number(v) || 0

export function goalProgress(goal: Goal, data: Data): Progress {
  const target = goal.target_value == null ? null : num(goal.target_value)
  const cap = (p: number) => Math.max(0, Math.min(100, p))

  if (goal.type === 'checklist') {
    const items = data.items.filter(i => i.goal_id === goal.id)
    const done = items.filter(i => i.done).length
    return { pct: items.length ? cap((done / items.length) * 100) : 0, current: done, target: items.length, label: `${done}/${items.length} done` }
  }
  if (goal.type === 'numeric') {
    const cur = data.entries.filter(e => e.goal_id === goal.id).reduce((a, e) => a + num(e.value), 0)
    return { pct: target ? cap((cur / target) * 100) : 0, current: cur, target, label: `${fmt(cur)} / ${fmt(target ?? 0)} ${goal.unit ?? ''}`.trim() }
  }
  if (goal.type === 'habit') {
    const cur = data.entries.filter(e => e.goal_id === goal.id).length
    return { pct: target ? cap((cur / target) * 100) : 0, current: cur, target, label: `${cur} / ${fmt(target ?? 0)} check-ins` }
  }
  // time (target in hours)
  const mins = data.times.filter(t => t.goal_id === goal.id).reduce((a, t) => a + num(t.minutes), 0)
  const hrs = mins / 60
  return { pct: target ? cap((hrs / target) * 100) : 0, current: hrs, target, label: `${fmt(hrs)}h / ${fmt(target ?? 0)}h` }
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Compare actual progress to straight-line progress between start and due date. */
export function paceOf(goal: Goal, pct: number): { pace: Pace; expected: number } {
  if (!goal.due_date || goal.status !== 'active') return { pace: 'none', expected: 0 }
  const total = Math.max(1, diffDays(goal.due_date, goal.start_date))
  const elapsed = Math.max(0, Math.min(total, diffDays(todayStr(), goal.start_date)))
  const expected = (elapsed / total) * 100
  const pace: Pace = pct >= 100 ? 'ahead' : pct >= expected + 5 ? 'ahead' : pct >= expected - 10 ? 'ontrack' : 'behind'
  return { pace, expected }
}

export const daysLeft = (goal: Goal) => (goal.due_date ? diffDays(goal.due_date, todayStr()) : null)

/** How many percentage points of `goal` this single log contributes (for the Insights charts). */
export function entryPct(goal: Goal, e: Entry): number {
  const target = num(goal.target_value)
  if (goal.type === 'numeric') return target ? (num(e.value) / target) * 100 : 0
  if (goal.type === 'habit') return target ? (1 / target) * 100 : 0
  return 0
}
export function timePct(goal: Goal, t: TimeEntry): number {
  const target = num(goal.target_value)
  return goal.type === 'time' && target ? (num(t.minutes) / 60 / target) * 100 : 0
}
export function itemPct(goal: Goal, data: Data): number {
  const n = data.items.filter(i => i.goal_id === goal.id).length
  return n ? 100 / n : 0
}
