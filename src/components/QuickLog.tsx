import { useState } from 'react'
import { useStore, check } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Modal } from './ui'
import { todayStr } from '../lib/dates'

/** Two-tap logging from anywhere: pick a goal, then log a value / check-in / time. */
export default function QuickLog({ onClose, goalId }: { onClose: () => void; goalId?: string }) {
  const { data, me, reload } = useStore()
  const active = data.goals.filter(g => g.status === 'active')
  const [gid, setGid] = useState(goalId ?? active[0]?.id ?? '')
  const goal = active.find(g => g.id === gid)
  const [value, setValue] = useState('')
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!goal || !me) return
    setBusy(true)
    if (goal.type === 'numeric' && Number(value) > 0) {
      await check(supabase.from('progress_entries').insert({ goal_id: goal.id, user_id: me.id, value: Number(value), note: note || null, entry_date: date }))
    }
    if (goal.type === 'habit') {
      await check(supabase.from('progress_entries').insert({ goal_id: goal.id, user_id: me.id, value: 1, note: note || null, entry_date: date }))
    }
    if (Number(minutes) > 0) {
      await check(supabase.from('time_entries').insert({ goal_id: goal.id, user_id: me.id, minutes: Number(minutes), note: note || null, entry_date: date }))
    }
    await reload()
    setBusy(false)
    onClose()
  }

  const needsValue = goal?.type === 'numeric'
  const canSave = !!goal && (goal.type === 'habit' || (needsValue && Number(value) > 0) || Number(minutes) > 0)

  return (
    <Modal title="Quick log" onClose={onClose}>
      {active.length === 0 ? <p className="text-slate-500">Create a goal first.</p> : (
        <div className="space-y-3">
          <div>
            <label className="label">Goal</label>
            <select className="input" value={gid} onChange={e => setGid(e.target.value)}>
              {active.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          {goal?.type === 'numeric' && (
            <div>
              <label className="label">Amount {goal.unit ? `(${goal.unit})` : ''}</label>
              <input className="input" type="number" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} autoFocus />
            </div>
          )}
          {goal?.type === 'habit' && <p className="text-sm text-slate-600">✅ Logs one check-in for this habit.</p>}
          {goal?.type === 'checklist' && <p className="text-sm text-slate-500">Tick checklist items on the goal page. You can still log time here.</p>}
          <div>
            <label className="label">Time spent (minutes, optional)</label>
            <input className="input" type="number" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} /></div>
            <div><label className="label">Note</label><input className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
          </div>
          <button className="btn w-full disabled:opacity-40" disabled={!canSave || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      )}
    </Modal>
  )
}
