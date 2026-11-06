import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { StoreProvider } from './lib/store'
import Login from './pages/Login'
import Layout from './components/Layout'
import Home from './pages/Home'
import Goals from './pages/Goals'
import GoalDetail from './pages/GoalDetail'
import TimePage from './pages/Time'
import Insights from './pages/Insights'
import Settings from './pages/Settings'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!configured) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 card">
        <h1 className="text-xl font-bold mb-2">Supabase not configured</h1>
        <p className="text-sm text-slate-600">Copy <code>.env.example</code> to <code>.env</code> and fill in your project URL and anon key (see README).</p>
      </div>
    )
  }
  if (!ready) return <div className="p-10 text-center text-slate-400">Loading…</div>
  if (!session) return <Login />

  return (
    <StoreProvider session={session}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="goals" element={<Goals />} />
          <Route path="goals/:id" element={<GoalDetail />} />
          <Route path="time" element={<TimePage />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  )
}
