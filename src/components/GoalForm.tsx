import { useState } from 'react'
import { useStore, check } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Modal } from './ui'
import { todayStr } from '../lib/dates'
import type { Goal, GoalType } from '../types'

const TYPES: { id: GoalType; label: string; hint: string }[] = [
  { id: 'numeric', label: '🔢 Number', hint: 'e.g. save ₹50,000, run 200 km' },
  { id: 'checklist', label: '☑️ Checklist', hint: 'milestones to tick off' },
  { id: 'habit', label: '🔁 Habit', hint: 'daily check-ins with a streak' },
  { id: 'time', label: '⏱️ Time', hint: 'hours to spend, e.g. 100h guitar' },
]
const CATEGORIES = ['Health', 'Money', 'Learning', 'Travel', 'Home', 'Relationship', 'Career', 'Fun']

export default function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { data, me, reload } = useStore()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [type, setType] = useState<GoalType>(goal?.type ?? 'numeric')
  const [owner, setOwner] = useState<string>(goal ? goal.owner_id ?? 'shared' : me?.id ?? 'shared')
  const [category, setCategory] = useState(goal?.category ?? '')
  const [target, setTarget] = useState(goal?.target_value?.toString() ?? '')
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [start, setStart] = useState(goal?.start_date ?? todayStr())
  const [due, setDue] = useState(goal?.due_date ?? '')
  const [desc, setDesc] = useState(goal?.description ?? '')
  const [busy, setBusy] = useState(false)

  const needsTarget = type !== 'checklist'
  const valid = title.trim() && (!needsTarget || Number(target) > 0)

  async function save() {
    setBusy(true)
    const row = {
      title: title.trim(), description: desc || null, category: category || null, type,
      owner_id: owner === 'shared' ? null : owner,
      target_value: needsTarget ? Number(target) : null,
      unit: type === 'numeric' ? unit || null : type === 'time' ? 'hours' : null,
      start_date: start, due_date: due || null,
    }
    const res = goal
      ? await check(supabase.from('goals').update(row).eq('id', goal.id))
      : await check(supabase.from('goals').insert(row))
    if (!res.error) { await reload(); onClose() }
    setBusy(false)
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Save for Goa trip" autoFocus /></div>

        <div>
          <label className="label">How do you track it?</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button key={t.id} type="button" disabled={!!goal} onClick={() => setType(t.id)}
                className={`text-left p-2.5 rounded-xl border text-sm ${type === t.id ? 'border-ink bg-accent-soft' : 'border-slate-200'} disabled:opacity-60`}>
                <div className="font-semibold">{t.label}</div><div className="text-xs text-slate-500">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {needsTarget && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{type === 'habit' ? 'Target check-ins' : type === 'time' ? 'Target hours' : 'Target amount'}</label>
              <input className="input" type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></div>
            {type === 'numeric' && <div><label className="label">Unit</label><input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="₹, km, kg…" /></div>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Whose goal?</label>
            <select className="input" value={owner} onChange={e => setOwner(e.target.value)}>
              {data.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="shared">Shared (both)</option>
            </select></div>
          <div><label className="label">Category</label>
            <input className="input" list="cats" value={category} onChange={e => setCategory(e.target.value)} />
            <datalist id="cats">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start</label><input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><label className="label">Due (optional)</label><input className="input" type="date" value={due} min={start} onChange={e => setDue(e.target.value)} /></div>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <button className="btn w-full disabled:opacity-40" disabled={!valid || busy} onClick={save}>{busy ? 'Saving…' : 'Save goal'}</button>
      </div>
    </Modal>
  )
}
