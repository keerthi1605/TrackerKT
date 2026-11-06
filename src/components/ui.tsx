import type { ReactNode } from 'react'
import type { Goal, Profile } from '../types'
import { goalLook, lookOf, ownerName } from '../lib/people'
import { paceOf, type Pace } from '../lib/progress'
import { addDays, todayStr } from '../lib/dates'

export function ProgressBar({ pct, className = 'bg-accent' }: { pct: number; className?: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function Ring({ pct, size = 96, color = 'var(--accent)', children }: { pct: number; size?: number; color?: string; children?: ReactNode }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function PaceBadge({ goal, pct }: { goal: Goal; pct: number }) {
  const { pace } = paceOf(goal, pct)
  const map: Record<Pace, [string, string] | null> = {
    ahead: ['Ahead', 'bg-emerald-100 text-emerald-800'],
    ontrack: ['On track', 'bg-sky-100 text-sky-800'],
    behind: ['Behind', 'bg-amber-100 text-amber-800'],
    none: null,
  }
  const m = map[pace]
  return m ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m[1]}`}>{m[0]}</span> : null
}

export function OwnerChip({ goal, profiles }: { goal: Goal; profiles: Profile[] }) {
  const look = goalLook(goal, profiles)
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${look.chip}`}>{ownerName(goal, profiles)}</span>
}

export function StreakBadge({ days, big }: { days: number; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-orange-100 text-orange-700 ${big ? 'text-base px-3 py-1' : 'text-xs px-2 py-0.5'}`}>
      🔥 {days}{big ? ' day streak' : ''}
    </span>
  )
}

/** Last N days as dots; filled = active that day. */
export function DayDots({ dates, n = 14, color = 'var(--accent)' }: { dates: Set<string>; n?: number; color?: string }) {
  const today = todayStr()
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)))
  return (
    <div className="flex flex-wrap gap-1">
      {days.map(d => (
        <span key={d} title={d} className="w-3.5 h-3.5 rounded-full border"
          style={dates.has(d) ? { background: color, borderColor: color } : { borderColor: '#e2e8f0' }} />
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div className="card w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5 rounded-b-none sm:rounded-b-[1.25rem]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PersonDot({ p }: { p?: Profile }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: lookOf(p).chart }} />
}
