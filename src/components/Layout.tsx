import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'
import QuickLog from './QuickLog'
import { lookOf } from '../lib/people'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/time', label: 'Time', icon: '⏱️' },
  { to: '/insights', label: 'Insights', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { me, loading } = useStore()
  const [quick, setQuick] = useState(false)
  // desktop sidebar can be collapsed to a slim icon rail; remembered between visits
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('navCollapsed') === '1')
  const look = lookOf(me)

  const toggle = () => setCollapsed(c => { localStorage.setItem('navCollapsed', c ? '0' : '1'); return !c })

  // the whole app takes on the logged-in person's theme (page background, buttons, accents)
  useEffect(() => {
    const n = me?.name.toLowerCase()
    if (n) { document.documentElement.dataset.theme = n; localStorage.setItem('lastUser', n) }
  }, [me])

  const link = (isActive: boolean, rail = false) =>
    `flex flex-col md:flex-row items-center gap-0.5 md:gap-3 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
      rail ? 'md:justify-center md:px-0' : ''} ${
      isActive ? 'bg-white/80 text-ink shadow-sm' : 'text-ink/70 hover:bg-white/40'}`

  return (
    <div className="min-h-dvh md:flex">
      {/* desktop sidebar: darker shade of the page background, collapsible */}
      <aside style={{ background: 'var(--side)' }}
        className={`hidden md:flex flex-col shrink-0 p-3 gap-1 sticky top-0 h-dvh transition-[width] duration-200 ${collapsed ? 'w-[4.5rem]' : 'w-56 lg:w-60'}`}>
        <div className={`flex items-center mb-4 ${collapsed ? 'justify-center' : 'justify-between px-2'}`}>
          {!collapsed && <span className="text-lg font-bold text-ink">🎯 Our Tracker</span>}
          <button onClick={toggle} aria-label={collapsed ? 'Open navigation' : 'Close navigation'} title={collapsed ? 'Open navigation' : 'Close navigation'}
            className="w-9 h-9 rounded-lg text-ink hover:bg-white/50 text-xl leading-none">
            {collapsed ? '»' : '«'}
          </button>
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => link(isActive, collapsed)}>
            <span className="text-lg">{n.icon}</span>{!collapsed && n.label}
          </NavLink>
        ))}
        {!collapsed
          ? <div className="mt-auto px-3 text-sm text-ink/70">Signed in as <b className={look.text}>{me?.name}</b></div>
          : <div title={me?.name} className="mt-auto mx-auto w-9 h-9 rounded-full flex items-center justify-center font-bold text-ink bg-white/60">{me?.name[0]}</div>}
      </aside>

      <main className="flex-1 min-w-0 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-5 md:pt-8 pb-28 md:pb-12">
        {loading ? <div className="text-center text-slate-400 mt-20">Loading…</div> : <Outlet />}
      </main>

      {/* mobile bottom tabs */}
      <nav style={{ background: 'var(--side)' }} className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => link(isActive)}>
            <span className="text-xl">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </nav>

      <button onClick={() => setQuick(true)} aria-label="Quick add"
        className="fixed z-40 right-4 bottom-24 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-accent text-ink font-bold text-3xl shadow-lg active:scale-95">
        +
      </button>
      {quick && <QuickLog onClose={() => setQuick(false)} />}
    </div>
  )
}
