import type { Goal, Profile } from '../types'

// Keerthi = lilac fills with moderate-purple text, Tarun = sage fills with hunter-green text, shared = soft slate.
export interface Look {
  chart: string   // fill colour for charts / dots
  dark: string    // readable text colour (hex) for names on white
  bg: string; text: string; bar: string; chip: string  // tailwind classes
}

const purple: Look = { chart: '#c8a2c8', dark: '#7b4fae', bg: 'bg-[#f1e4f1]', text: 'text-[#7b4fae]', bar: 'bg-[#c8a2c8]', chip: 'bg-[#e6d0e6] text-[#7b4fae]' }
const sage: Look = { chart: '#9caf88', dark: '#355e3b', bg: 'bg-[#e6ecde]', text: 'text-[#355e3b]', bar: 'bg-[#9caf88]', chip: 'bg-[#cbd8bd] text-[#355e3b]' }
const slate: Look = { chart: '#94a3b8', dark: '#475569', bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-300', chip: 'bg-slate-200 text-slate-800' }

export const lookOf = (p?: Profile | null): Look => {
  const n = p?.name.toLowerCase()
  return n === 'keerthi' ? purple : n === 'tarun' ? sage : slate
}
export const sharedLook = slate

export const goalLook = (g: Goal, profiles: Profile[]) =>
  g.owner_id ? lookOf(profiles.find(p => p.id === g.owner_id)) : sharedLook

export const ownerName = (g: Goal, profiles: Profile[]) =>
  g.owner_id ? profiles.find(p => p.id === g.owner_id)?.name ?? '—' : 'Shared'
