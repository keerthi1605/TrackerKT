import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, check } from '../lib/store'
import { supabase } from '../lib/supabase'
import { goalProgress, daysLeft } from '../lib/progress'
import { goalLook, lookOf } from '../lib/people'
import { habitStreak } from '../lib/streak'
import { fmtMinutes, shortDate, todayStr } from '../lib/dates'
import { DayDots, OwnerChip, PaceBadge, ProgressBar, StreakBadge } from '../components/ui'
import GoalForm from '../components/GoalForm'
import QuickLog from '../components/QuickLog'

export default function GoalDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, me, reload } = useStore()
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [newItem, setNewItem] = useState('')
  const goal = data.goals.find(g => g.id === id)
  if (!goal || !me) return <div className="text-center text-slate-500 mt-16">Goal not found. <Link to="/goals" className="underline">Back</Link></div>

  const p = goalProgress(goal, data)
  const look = goalLook(goal, data.profiles)
  const items = data.items.filter(i => i.goal_id === goal.id).sort((a, b) => a.position - b.position)
  const entries = data.entries.filter(e => e.goal_id === goal.id).sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const times = data.times.filter(t => t.goal_id === goal.id).sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const totalMin = times.reduce((a, t) => a + Number(t.minutes), 0)
  const left = daysLeft(goal)
  const name = (uid: string) => data.profiles.find(x => x.id === uid)?.name ?? '?'
  const today = todayStr()

  const setStatus = async (status: string) => { await check(supabase.from('goals').update({ status }).eq('id', goal.id)); await reload() }
  async function remove() {
    if (!confirm('Delete this goal and all its history?')) return
    await check(supabase.from('goals').delete().eq('id', goal!.id)); await reload(); nav('/goals')
  }
  async function toggleItem(itemId: string, done: boolean) {
    await check(supabase.from('goal_items').update({
      done: !done, completed_at: done ? null : new Date().toISOString(), completed_by: done ? null : me!.id,
    }).eq('id', itemId))
    await reload()
  }
  async function addItem() {
    if (!newItem.trim()) return
    await check(supabase.from('goal_items').insert({ goal_id: goal!.id, text: newItem.trim(), position: items.length }))
    setNewItem(''); await reload()
  }
  async function delRow(table: 'goal_items' | 'progress_entries' | 'time_entries', rowId: string) {
    await check(supabase.from(table).delete().eq('id', rowId)); await reload()
  }

  return (
    <div className="space-y-4">
      <Link to="/goals" className="text-sm text-slate-500">← Goals</Link>
      <div className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{goal.title}</h1>
          <span className="text-2xl font-bold">{Math.round(p.pct)}%</span>
        </div>
        <div className="my-3"><ProgressBar pct={p.pct} className={look.bar} /></div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <OwnerChip goal={goal} profiles={data.profiles} /><PaceBadge goal={goal} pct={p.pct} />
          {goal.category && <span className="px-2 py-0.5 rounded-full bg-slate-100">{goal.category}</span>}
          <span>{p.label}</span>
          {left != null && <span>{left < 0 ? `${-left}d overdue` : `${left}d left`} · due {shortDate(goal.due_date!)}</span>}
        </div>
        {goal.description && <p className="text-sm text-slate-600 mt-3">{goal.description}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          {goal.type !== 'checklist' && <button className="btn" onClick={() => setLogging(true)}>{goal.type === 'habit' ? '✓ Check in' : '+ Log'}</button>}
          {goal.type === 'checklist' && <button className="btn-ghost" onClick={() => setLogging(true)}>+ Log time</button>}
          <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          {goal.status === 'active'
            ? <button className="btn-ghost" onClick={() => setStatus('done')}>Mark done</button>
            : <button className="btn-ghost" onClick={() => setStatus('active')}>Reopen</button>}
          {goal.status !== 'archived' && <button className="btn-ghost" onClick={() => setStatus('archived')}>Archive</button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
      {goal.type === 'habit' && (() => {
        const mine = habitStreak(goal.id, data, me.id)
        const other = data.profiles.find(x => x.id !== me.id)
        const theirs = other ? habitStreak(goal.id, data, other.id) : null
        const set = (uid: string) => new Set(entries.filter(e => e.user_id === uid).map(e => e.entry_date))
        return (
          <div className="card p-4 space-y-3">
            <h2 className="font-bold">Streaks</h2>
            <div><div className="flex items-center gap-2 mb-1"><b className={`text-sm ${lookOf(me).text}`}>{me.name}</b><StreakBadge days={mine.current} /><span className="text-xs text-slate-400">best {mine.best}</span></div>
              <DayDots dates={set(me.id)} n={21} color={lookOf(me).chart} /></div>
            {other && theirs && <div><div className="flex items-center gap-2 mb-1"><b className={`text-sm ${lookOf(other).text}`}>{other.name}</b><StreakBadge days={theirs.current} /><span className="text-xs text-slate-400">best {theirs.best}</span></div>
              <DayDots dates={set(other.id)} n={21} color={lookOf(other).chart} /></div>}
            {!entries.some(e => e.user_id === me.id && e.entry_date === today) && <p className="text-xs text-slate-500">You haven't checked in today.</p>}
          </div>
        )
      })()}

      {goal.type === 'checklist' && (
        <div className="card p-4">
          <h2 className="font-bold mb-2">Checklist</h2>
          <div className="divide-y divide-slate-100">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-3 py-2">
                <button onClick={() => toggleItem(i.id, i.done)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm ${i.done ? 'bg-accent border-accent' : 'border-slate-300'}`}>{i.done && '✓'}</button>
                <span className={`flex-1 ${i.done ? 'line-through text-slate-400' : ''}`}>{i.text}</span>
                {i.done && i.completed_by && <span className="text-xs text-slate-400">{name(i.completed_by)}</span>}
                <button onClick={() => delRow('goal_items', i.id)} className="text-slate-300 px-1" aria-label="Delete item">×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input className="input" placeholder="Add a step…" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
            <button className="btn" onClick={addItem}>Add</button>
          </div>
        </div>
      )}

      {(goal.type === 'numeric' || goal.type === 'habit') && entries.length > 0 && (
        <div className="card p-4">
          <h2 className="font-bold mb-2">History</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {entries.slice(0, 30).map(e => (
              <div key={e.id} className="flex items-center gap-2 py-2">
                <span className="text-slate-400 w-14">{shortDate(e.entry_date)}</span>
                <span className="font-semibold" style={{ color: lookOf(data.profiles.find(x => x.id === e.user_id)).dark }}>{name(e.user_id)}</span>
                <span className="flex-1">{goal.type === 'numeric' ? `+${e.value} ${goal.unit ?? ''}` : 'checked in'}{e.note ? ` · ${e.note}` : ''}</span>
                {e.user_id === me.id && <button onClick={() => delRow('progress_entries', e.id)} className="text-slate-300 px-1" aria-label="Delete entry">×</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {times.length > 0 && (
        <div className="card p-4">
          <div className="flex justify-between mb-2"><h2 className="font-bold">Time spent</h2><span className="font-semibold">{fmtMinutes(totalMin)}</span></div>
          <div className="divide-y divide-slate-100 text-sm">
            {times.slice(0, 20).map(t => (
              <div key={t.id} className="flex items-center gap-2 py-2">
                <span className="text-slate-400 w-14">{shortDate(t.entry_date)}</span>
                <span className="font-semibold">{name(t.user_id)}</span>
                <span className="flex-1">{fmtMinutes(Number(t.minutes))}{t.note ? ` · ${t.note}` : ''}</span>
                {t.user_id === me.id && <button onClick={() => delRow('time_entries', t.id)} className="text-slate-300 px-1" aria-label="Delete time">×</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      <button className="btn-danger w-full sm:w-auto" onClick={remove}>Delete goal</button>
      {editing && <GoalForm goal={goal} onClose={() => setEditing(false)} />}
      {logging && <QuickLog goalId={goal.id} onClose={() => setLogging(false)} />}
    </div>
  )
}
