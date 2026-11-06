import { useState } from 'react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { lookOf } from '../lib/people'

export default function Settings() {
  const { me } = useStore()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function changePin() {
    setMsg(null)
    if (!/^\d{4}$/.test(pin)) return setMsg({ ok: false, text: 'PIN must be exactly 4 digits.' })
    if (pin !== pin2) return setMsg({ ok: false, text: "PINs don't match." })
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('change-pin', { body: { pin } })
    setBusy(false)
    if (error || !data?.ok) {
      let text = 'Could not change PIN.'
      try { text = (await (error as { context?: Response })?.context?.json())?.error ?? text } catch { /* default */ }
      return setMsg({ ok: false, text })
    }
    setPin(''); setPin2(''); setMsg({ ok: true, text: 'PIN changed. Share the new one with Tarun.' })
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="card p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: lookOf(me).chart }}>{me?.name[0]}</span>
        <div><div className="font-semibold">{me?.name}</div><div className="text-xs text-slate-500">{me?.is_admin ? 'Admin' : 'Member'}</div></div>
      </div>

      {me?.is_admin && (
        <div className="card p-4 space-y-3">
          <h2 className="font-bold">Change login PIN</h2>
          <p className="text-xs text-slate-500">Only you (admin) can change the shared 4-digit PIN.</p>
          <input className="input" inputMode="numeric" maxLength={4} type="password" placeholder="New PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
          <input className="input" inputMode="numeric" maxLength={4} type="password" placeholder="Repeat new PIN" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} />
          {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
          <button className="btn w-full disabled:opacity-40" disabled={busy} onClick={changePin}>{busy ? 'Saving…' : 'Update PIN'}</button>
        </div>
      )}

      <button className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>Log out</button>
    </div>
  )
}
