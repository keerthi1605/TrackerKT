import { Link } from 'react-router-dom'
import { useStore, check } from '../lib/store'
import { supabase } from '../lib/supabase'
import { activityDates, computeStreak } from '../lib/streak'
import { daysLeft, goalProgress, paceOf } from '../lib/progress'
import { lookOf } from '../lib/people'
import { todayStr } from '../lib/dates'
import { DayDots, ProgressBar, Ring, StreakBadge } from '../components/ui'
import GoalCard from '../components/GoalCard'
import type { Goal } from '../types'

export default function Home() {
  const { data, me, reload } = useStore()
  if (!me) return null
  const today = todayStr()
  const active = data.goals.filter(g => g.status === 'active')
  const pctOf = (g: Goal) => goalProgress(g, data).pct
  const avg = (gs: Goal[]) => (gs.length ? gs.reduce((a, g) => a + pctOf(g), 0) / gs.length : 0)

  const mine = computeStreak(activityDates(me.id, data))
  const dueSoon = active.filter(g => { const d = daysLeft(g); return d != null && d >= 0 && d <= 14 && pctOf(g) < 100 })
    .sort((a, b) => (daysLeft(a)! - daysLeft(b)!))
  const behind = active.filter(g => paceOf(g, pctOf(g)).pace === 'behind')
  const habits = active.filter(g => g.type === 'habit' && (g.owner_id === me.id || g.owner_id == null))

  async function toggleHabit(g: Goal) {
    const existing = data.entries.find(e => e.goal_id === g.id && e.user_id === me!.id && e.entry_date === today)
    if (existing) await check(supabase.from('progress_entries').delete().eq('id', existing.id))
    else await check(supabase.from('progress_entries').insert({ goal_id: g.id, user_id: me!.id, value: 1, entry_date: today }))
    await reload()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hi {me.name} 👋</h1>
        <StreakBadge days={mine.current} big />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
      <div className="card p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
        <Ring pct={avg(active)} size={104} color={lookOf(me).chart}>
          <div><div className="text-2xl font-bold">{Math.round(avg(active))}%</div><div className="text-[10px] text-slate-500">overall</div></div>
        </Ring>
        <div className="flex-1 space-y-3 min-w-0">
          {data.profiles.map(p => {
            const personal = active.filter(g => g.owner_id === p.id)
            const st = computeStreak(activityDates(p.id, data))
            const look = lookOf(p)
            return (
              <div key={p.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-semibold ${look.text}`}>{p.name} {st.current > 0 && <span className="text-orange-600 text-xs">🔥{st.current}</span>}</span>
                  <span className="text-slate-500">{Math.round(avg(personal))}%</span>
                </div>
                <ProgressBar pct={avg(personal)} className={look.bar} />
              </div>
            )
          })}
          {active.some(g => !g.owner_id) && (
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-slate-600">Shared</span><span className="text-slate-500">{Math.round(avg(active.filter(g => !g.owner_id)))}%</span></div>
              <ProgressBar pct={avg(active.filter(g => !g.owner_id))} className="bg-slate-300" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">Your streak</h2>
          <span className="text-xs text-slate-500">Best: {mine.best} days</span>
        </div>
        <DayDots dates={activityDates(me.id, data)} n={14} color={lookOf(me).chart} />
        <p className="text-xs text-slate-500 mt-2">
          {mine.activeToday ? 'Nice — you logged something today ✅' : mine.current > 0 ? `Log anything today to keep your ${mine.current}-day streak alive!` : 'Log anything today to start a streak.'}
        </p>
      </div>

      {habits.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Today's habits</h2>
          <div className="card divide-y divide-slate-100">
            {habits.map(g => {
              const done = data.entries.some(e => e.goal_id === g.id && e.user_id === me.id && e.entry_date === today)
              return (
                <button key={g.id} onClick={() => toggleHabit(g)} className="w-full flex items-center gap-3 p-3 text-left">
                  <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm ${done ? 'bg-accent border-accent text-ink' : 'border-slate-300'}`}>{done && '✓'}</span>
                  <span className={done ? 'line-through text-slate-400' : ''}>{g.title}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
      </div>
      </div>

      {(dueSoon.length > 0 || behind.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {dueSoon.length > 0 && <section><h2 className="font-bold mb-2">⏳ Due soon</h2><div className="space-y-3">{dueSoon.slice(0, 4).map(g => <GoalCard key={g.id} goal={g} />)}</div></section>}
          {behind.length > 0 && <section><h2 className="font-bold mb-2">⚠️ Behind pace</h2><div className="space-y-3">{behind.slice(0, 4).map(g => <GoalCard key={g.id} goal={g} />)}</div></section>}
        </div>
      )}

      {active.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          <p className="mb-3">No goals yet. Set your first one together!</p>
          <Link to="/goals" className="btn inline-block">Create a goal</Link>
        </div>
      )}
    </div>
  )
}
