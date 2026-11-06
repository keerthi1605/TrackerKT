import { useEffect, useState } from 'react'
import { useStore, check } from '../lib/store'
import { supabase } from '../lib/supabase'
import { fmtMinutes, lastNDays, shortDate, todayStr } from '../lib/dates'
import { lookOf } from '../lib/people'

interface Running { goalId: string; startedAt: number }
const KEY = 'tracker-timer'

export default function TimePage() {
  const { data, me, reload } = useStore()
  const active = data.goals.filter(g => g.status === 'active')
  const [running, setRunning] = useState<Running | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
  })
  const [now, setNow] = useState(Date.now())
  const [goalId, setGoalId] = useState(active[0]?.id ?? '')
  const [mins, setMins] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!goalId && active[0]) setGoalId(active[0].id) }, [active, goalId])

  const title = (id: string | null) => data.goals.find(g => g.id === id)?.title ?? 'General'
  const week = new Set(lastNDays(7))
  const myTimes = data.times.filter(t => t.user_id === me?.id)
  const todayMin = myTimes.filter(t => t.entry_date === todayStr()).reduce((a, t) => a + Number(t.minutes), 0)
  const weekMin = myTimes.filter(t => week.has(t.entry_date)).reduce((a, t) => a + Number(t.minutes), 0)

  function start() {
    if (!goalId) return
    const r = { goalId, startedAt: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(r)); setRunning(r)
  }
  async function stop() {
    if (!running || !me) return
    const minutes = Math.max(1, Math.round((Date.now() - running.startedAt) / 60000))
    await check(supabase.from('time_entries').insert({ goal_id: running.goalId, user_id: me.id, minutes, entry_date: todayStr(), note: 'timer' }))
    localStorage.removeItem(KEY); setRunning(null); await reload()
  }
  async function addManual() {
    if (!me || !goalId || !(Number(mins) > 0)) return
    await check(supabase.from('time_entries').insert({ goal_id: goalId, user_id: me.id, minutes: Number(mins), note: note || null, entry_date: date }))
    setMins(''); setNote(''); await reload()
  }
  async function del(id: string) { await check(supabase.from('time_entries').delete().eq('id', id)); await reload() }

  const elapsed = running ? Math.floor((now - running.startedAt) / 1000) : 0
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const recent = [...data.times].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || 0).slice(0, 25)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Time</h1>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><div className="text-xs text-slate-500">Today</div><div className="text-2xl font-bold">{fmtMinutes(todayMin)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Last 7 days</div><div className="text-2xl font-bold">{fmtMinutes(weekMin)}</div></div>
      </div>

      <div className="card p-4 text-center">
        {running ? (
          <>
            <div className="text-sm text-slate-500">Working on <b>{title(running.goalId)}</b></div>
            <div className="text-5xl font-bold tabular-nums my-3">{hh}:{mm}:{ss}</div>
            <button className="btn-danger w-full" onClick={stop}>⏹ Stop & save</button>
          </>
        ) : (
          <>
            <select className="input mb-3" value={goalId} onChange={e => setGoalId(e.target.value)}>
              {active.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            <button className="btn w-full disabled:opacity-40" disabled={!goalId} onClick={start}>▶ Start timer</button>
          </>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-bold">Add time manually</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Minutes</label><input className="input" type="number" inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} /></div>
          <div><label className="label">Date</label><input className="input" type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <input className="input" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="btn w-full disabled:opacity-40" disabled={!goalId || !(Number(mins) > 0)} onClick={addManual}>Add</button>
      </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold mb-2">Recent</h2>
        {recent.length === 0 && <p className="text-sm text-slate-500">No time logged yet.</p>}
        <div className="divide-y divide-slate-100 text-sm">
          {recent.map(t => {
            const who = data.profiles.find(p => p.id === t.user_id)
            return (
              <div key={t.id} className="flex items-center gap-2 py-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: lookOf(who).chart }} />
                <span className="text-slate-400 w-14">{shortDate(t.entry_date)}</span>
                <span className="flex-1 truncate">{title(t.goal_id)}{t.note ? ` · ${t.note}` : ''}</span>
                <span className="font-semibold">{fmtMinutes(Number(t.minutes))}</span>
                {t.user_id === me?.id && <button onClick={() => del(t.id)} className="text-slate-300 px-1" aria-label="Delete">×</button>}
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}
