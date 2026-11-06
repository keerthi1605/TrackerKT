import { useState } from 'react'
import { useStore } from '../lib/store'
import GoalCard from '../components/GoalCard'
import GoalForm from '../components/GoalForm'

type Who = 'all' | 'me' | 'other' | 'shared'

export default function Goals() {
  const { data, me } = useStore()
  const [who, setWho] = useState<Who>('all')
  const [status, setStatus] = useState<'active' | 'done' | 'archived'>('active')
  const [creating, setCreating] = useState(false)
  const other = data.profiles.find(p => p.id !== me?.id)

  const list = data.goals
    .filter(g => g.status === status)
    .filter(g => who === 'all' || (who === 'me' && g.owner_id === me?.id) || (who === 'other' && g.owner_id === other?.id) || (who === 'shared' && !g.owner_id))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${on ? 'bg-accent/40 text-ink' : 'bg-white text-slate-500'}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <button className="btn" onClick={() => setCreating(true)}>+ New goal</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {([['all', 'All'], ['me', 'Mine'], ['other', other?.name ?? 'Partner'], ['shared', 'Shared']] as const).map(([k, l]) =>
          <button key={k} className={chip(who === k)} onClick={() => setWho(k)}>{l}</button>)}
        <span className="w-px bg-slate-200 mx-1" />
        {(['active', 'done', 'archived'] as const).map(s =>
          <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">
        {list.map(g => <GoalCard key={g.id} goal={g} />)}
        {list.length === 0 && <div className="card p-8 text-center text-slate-500 sm:col-span-2 xl:col-span-3">Nothing here yet.</div>}
      </div>
      {creating && <GoalForm onClose={() => setCreating(false)} />}
    </div>
  )
}
