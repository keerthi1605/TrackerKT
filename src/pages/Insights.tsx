import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { addDays, diffDays, fmtMinutes, lastNDays, shortDate, todayStr, weekday } from '../lib/dates'
import { entryPct, itemPct, timePct } from '../lib/progress'
import { activityDates, computeStreak } from '../lib/streak'
import { lookOf } from '../lib/people'
import type { Data, Goal } from '../types'

type Range = 'week' | 'month'
type Who = 'both' | string

function pctUpTo(goal: Goal, data: Data, date: string): number {
  const t = Number(goal.target_value) || 0
  if (goal.type === 'numeric') return t ? (data.entries.filter(e => e.goal_id === goal.id && e.entry_date <= date).reduce((a, e) => a + Number(e.value), 0) / t) * 100 : 0
  if (goal.type === 'habit') return t ? (data.entries.filter(e => e.goal_id === goal.id && e.entry_date <= date).length / t) * 100 : 0
  if (goal.type === 'time') return t ? (data.times.filter(x => x.goal_id === goal.id && x.entry_date <= date).reduce((a, x) => a + Number(x.minutes), 0) / 60 / t) * 100 : 0
  const items = data.items.filter(i => i.goal_id === goal.id)
  return items.length ? (items.filter(i => i.done && i.completed_at && i.completed_at.slice(0, 10) <= date).length / items.length) * 100 : 0
}

export default function Insights() {
  const { data, me } = useStore()
  const [range, setRange] = useState<Range>('week')
  const [who, setWho] = useState<Who>('both')
  const [goalId, setGoalId] = useState<string>('')
  const n = range === 'week' ? 7 : 30
  const days = useMemo(() => lastNDays(n), [n])
  const prevDays = useMemo(() => lastNDays(n, addDays(todayStr(), -n)), [n])
  const people = data.profiles.filter(p => who === 'both' || p.id === who)
  const goalById = (id: string | null) => data.goals.find(g => g.id === id)

  /** progress points + minutes per person per day */
  const perDay = useMemo(() => {
    const out: Record<string, Record<string, { pts: number; min: number }>> = {}
    const slot = (d: string, uid: string) => ((out[d] ??= {})[uid] ??= { pts: 0, min: 0 })
    for (const e of data.entries) { const g = goalById(e.goal_id); if (g) slot(e.entry_date, e.user_id).pts += entryPct(g, e) }
    for (const t of data.times) { const g = goalById(t.goal_id); slot(t.entry_date, t.user_id).min += Number(t.minutes); if (g) slot(t.entry_date, t.user_id).pts += timePct(g, t) }
    for (const i of data.items) {
      if (i.done && i.completed_at && i.completed_by) { const g = goalById(i.goal_id); if (g) slot(i.completed_at.slice(0, 10), i.completed_by).pts += itemPct(g, data) }
    }
    return out
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = (d: string) => (range === 'week' ? weekday(d) : shortDate(d))
  const ptsRows = days.map(d => ({ day: label(d), ...Object.fromEntries(people.map(p => [p.name, Math.round((perDay[d]?.[p.id]?.pts ?? 0) * 10) / 10])) }))
  const hrsRows = days.map(d => ({ day: label(d), ...Object.fromEntries(people.map(p => [p.name, Math.round(((perDay[d]?.[p.id]?.min ?? 0) / 60) * 100) / 100])) }))

  const sum = (ds: string[], key: 'pts' | 'min') => ds.reduce((a, d) => a + people.reduce((b, p) => b + (perDay[d]?.[p.id]?.[key] ?? 0), 0), 0)
  const activeDays = (ds: string[]) => ds.filter(d => people.some(p => (perDay[d]?.[p.id]?.pts ?? 0) > 0 || (perDay[d]?.[p.id]?.min ?? 0) > 0)).length
  const delta = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? '+new' : '–') : `${cur >= prev ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}%`)
  const cards = [
    { t: 'Time', cur: sum(days, 'min'), prev: sum(prevDays, 'min'), f: (v: number) => fmtMinutes(v) },
    { t: 'Progress', cur: sum(days, 'pts'), prev: sum(prevDays, 'pts'), f: (v: number) => `${Math.round(v)} pts` },
    { t: 'Active days', cur: activeDays(days), prev: activeDays(prevDays), f: (v: number) => `${v}/${n}` },
  ]

  // time per goal in range
  const set = new Set(days)
  const perGoal = data.goals.map(g => ({
    g, min: data.times.filter(t => t.goal_id === g.id && set.has(t.entry_date) && people.some(p => p.id === t.user_id)).reduce((a, t) => a + Number(t.minutes), 0),
  })).filter(x => x.min > 0).sort((a, b) => b.min - a.min).slice(0, 8)
  const maxMin = Math.max(1, ...perGoal.map(x => x.min))

  // cumulative vs pace for one goal
  const pickable = data.goals.filter(g => g.status !== 'archived')
  const goal = pickable.find(g => g.id === goalId) ?? pickable.find(g => g.status === 'active')
  const paceRows = useMemo(() => {
    if (!goal) return []
    const today = todayStr()
    const end = goal.due_date && goal.due_date > today ? goal.due_date : today
    const span = Math.max(1, diffDays(end, goal.start_date))
    const step = Math.max(1, Math.ceil(span / 45))
    const rows: { day: string; actual?: number; expected?: number }[] = []
    for (let i = 0; i <= span; i += step) {
      const d = addDays(goal.start_date, i)
      rows.push({
        day: shortDate(d),
        actual: d <= today ? Math.round(pctUpTo(goal, data, d)) : undefined,
        expected: goal.due_date ? Math.min(100, Math.round((i / Math.max(1, diffDays(goal.due_date, goal.start_date))) * 100)) : undefined,
      })
    }
    return rows
  }, [goal, data])

  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-sm font-semibold ${on ? 'bg-accent/40 text-ink' : 'bg-white text-slate-500'}`

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Insights</h1>
      <div className="flex flex-wrap gap-2">
        <button className={chip(range === 'week')} onClick={() => setRange('week')}>Week</button>
        <button className={chip(range === 'month')} onClick={() => setRange('month')}>Month</button>
        <span className="w-px bg-slate-200 mx-1" />
        <button className={chip(who === 'both')} onClick={() => setWho('both')}>Both</button>
        {data.profiles.map(p => <button key={p.id} className={chip(who === p.id)} onClick={() => setWho(p.id)}>{p.id === me?.id ? 'Me' : p.name}</button>)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.t} className="card p-3">
            <div className="text-xs text-slate-500">{c.t}</div>
            <div className="text-lg font-bold leading-tight">{c.f(c.cur)}</div>
            <div className={`text-xs font-semibold ${c.cur >= c.prev ? 'text-green-600' : 'text-amber-600'}`}>{delta(c.cur, c.prev)} <span className="text-slate-400 font-normal">vs prev {range}</span></div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="card p-4">
        <h2 className="font-bold mb-1">Progress made per day</h2>
        <p className="text-xs text-slate-500 mb-2">Percentage points added across goals</p>
        <Chart rows={ptsRows} people={people} />
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-1">Hours per day</h2>
        <Chart rows={hrsRows} people={people} />
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-2">Time by goal</h2>
        {perGoal.length === 0 && <p className="text-sm text-slate-500">No time logged in this period.</p>}
        <div className="space-y-2">
          {perGoal.map(({ g, min }) => (
            <div key={g.id}>
              <div className="flex justify-between text-sm"><span className="truncate">{g.title}</span><span className="font-semibold">{fmtMinutes(min)}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-accent" style={{ width: `${(min / maxMin) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-bold">Progress vs pace</h2>
          <select className="input !w-auto max-w-[60%]" value={goal?.id ?? ''} onChange={e => setGoalId(e.target.value)}>
            {pickable.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        {goal ? (
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={paceRows} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="expected" name="Expected pace" stroke="#94a3b8" strokeDasharray="5 4" dot={false} connectNulls />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--accent-ink)" strokeWidth={3} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-slate-500">Create a goal to see its pace.</p>}
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-2">🔥 Streaks</h2>
        <div className="grid grid-cols-2 gap-3">
          {data.profiles.map(p => {
            const s = computeStreak(activityDates(p.id, data))
            return (
              <div key={p.id} className={`rounded-xl p-3 ${lookOf(p).bg}`}>
                <div className={`text-sm font-semibold ${lookOf(p).text}`}>{p.name}</div>
                <div className="text-2xl font-bold">{s.current} <span className="text-sm font-normal text-slate-500">days</span></div>
                <div className="text-xs text-slate-500">best {s.best}</div>
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

function Chart({ rows, people }: { rows: Record<string, string | number>[]; people: { id: string; name: string }[] }) {
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} allowDecimals />
          <Tooltip />
          <Legend />
          {people.map(p => <Bar key={p.id} dataKey={p.name} stackId="a" fill={lookOf(p as never).chart} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
