import { Link } from 'react-router-dom'
import type { Goal } from '../types'
import { useStore } from '../lib/store'
import { goalProgress, daysLeft } from '../lib/progress'
import { goalLook } from '../lib/people'
import { habitStreak } from '../lib/streak'
import { OwnerChip, PaceBadge, ProgressBar, StreakBadge } from './ui'

const ICON = { checklist: '☑️', numeric: '🔢', habit: '🔁', time: '⏱️' } as const

export default function GoalCard({ goal }: { goal: Goal }) {
  const { data } = useStore()
  const p = goalProgress(goal, data)
  const look = goalLook(goal, data.profiles)
  const left = daysLeft(goal)
  const streak = goal.type === 'habit' ? habitStreak(goal.id, data) : null

  return (
    <Link to={`/goals/${goal.id}`} className="card block p-4 active:scale-[.99] transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-semibold leading-snug">{ICON[goal.type]} {goal.title}</div>
        <span className="text-sm font-bold text-slate-600">{Math.round(p.pct)}%</span>
      </div>
      <ProgressBar pct={p.pct} className={look.bar} />
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
        <OwnerChip goal={goal} profiles={data.profiles} />
        <PaceBadge goal={goal} pct={p.pct} />
        {streak && streak.current > 0 && <StreakBadge days={streak.current} />}
        <span>{p.label}</span>
        {left != null && goal.status === 'active' && (
          <span className={left < 0 ? 'text-red-600 font-semibold' : ''}>
            {left < 0 ? `${-left}d overdue` : left === 0 ? 'due today' : `${left}d left`}
          </span>
        )}
      </div>
    </Link>
  )
}
