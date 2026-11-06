import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Data, Profile } from '../types'

const TABLES = {
  profiles: 'profiles',
  goals: 'goals',
  items: 'goal_items',
  entries: 'progress_entries',
  times: 'time_entries',
} as const

const empty: Data = { profiles: [], goals: [], items: [], entries: [], times: [] }

interface Ctx {
  data: Data
  me: Profile | null
  loading: boolean
  reload: () => Promise<void>
}
const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [data, setData] = useState<Data>(empty)
  const [loading, setLoading] = useState(true)
  const timer = useRef<number | undefined>(undefined)

  const loadKey = useCallback(async (key: keyof typeof TABLES) => {
    const { data: rows, error } = await supabase.from(TABLES[key]).select('*')
    if (!error && rows) setData(d => ({ ...d, [key]: rows }))
  }, [])

  const reload = useCallback(async () => {
    await Promise.all((Object.keys(TABLES) as (keyof typeof TABLES)[]).map(loadKey))
  }, [loadKey])

  useEffect(() => {
    reload().finally(() => setLoading(false))
    // Realtime: when anything changes (you or your partner), refetch that table (debounced).
    const dirty = new Set<keyof typeof TABLES>()
    const flush = () => { const keys = [...dirty]; dirty.clear(); keys.forEach(loadKey) }
    let channel = supabase.channel('tracker-sync')
    ;(Object.keys(TABLES) as (keyof typeof TABLES)[]).forEach(key => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: TABLES[key] }, () => {
        dirty.add(key)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, 150)
      })
    })
    channel.subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [reload, loadKey])

  const me = useMemo(() => data.profiles.find(p => p.id === session.user.id) ?? null, [data.profiles, session.user.id])
  const value = useMemo(() => ({ data, me, loading, reload }), [data, me, loading, reload])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore outside provider')
  return c
}

/** Surface Supabase write errors instead of failing silently. */
export async function check<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const res = await p
  if (res.error) alert(res.error.message)
  return res
}
