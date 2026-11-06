import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const PEOPLE = [
  { id: 'keerthi', name: 'Keerthi', cls: 'bg-[#e6d0e6] text-[#7b4fae] ring-[#7b4fae]' },
  { id: 'tarun', name: 'Tarun', cls: 'bg-[#cbd8bd] text-[#355e3b] ring-[#355e3b]' },
] as const

export default function Login() {
  const [who, setWho] = useState<string>(() => localStorage.getItem('lastUser') ?? 'keerthi')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  // login screen already previews the chosen person's colours
  useEffect(() => { document.documentElement.dataset.theme = who }, [who])

  async function submit(code: string) {
    setBusy(true); setErr('')
    const { data, error } = await supabase.functions.invoke('pin-login', { body: { user: who, pin: code } })
    if (error || !data?.token_hash) {
      let msg = 'Could not sign in'
      try { msg = (await (error as { context?: Response })?.context?.json())?.error ?? msg } catch { /* keep default */ }
      setErr(msg); setPin(''); setBusy(false); return
    }
    const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
    if (vErr) { setErr(vErr.message); setPin(''); setBusy(false); return }
    localStorage.setItem('lastUser', who)
  }

  function change(next: string) {
    if (busy) return
    const clean = next.replace(/\D/g, '').slice(0, 4)
    setPin(clean); setErr('')
    if (clean.length === 4) submit(clean)
  }

  // Type the PIN on a physical keyboard (ignored while the dots field itself has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return
      if (/^\d$/.test(e.key)) change(pin + e.key)
      else if (e.key === 'Backspace') change(pin.slice(0, -1))
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setWho(w => (w === 'keerthi' ? 'tarun' : 'keerthi'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-[#f1e4f1] via-white to-[#e6ecde]">
      <div className="card w-full max-w-sm sm:max-w-md p-6 sm:p-8 text-center">
        <div className="text-4xl mb-1">🎯</div>
        <h1 className="text-2xl font-bold">Our Tracker</h1>
        <p className="text-sm text-slate-500 mb-4">Who's logging in?</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {PEOPLE.map(p => (
            <button key={p.id} onClick={() => { setWho(p.id); setErr('') }}
              className={`rounded-2xl py-3 font-semibold ${p.cls} ${who === p.id ? 'ring-2' : 'opacity-60'}`}>
              {p.name}
            </button>
          ))}
        </div>

        {/* tap the dots to type with the phone's own keyboard */}
        <label className="relative flex justify-center gap-3 mb-2 h-6 cursor-text">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-ink border-ink' : 'border-slate-300'}`} />
          ))}
          <input ref={field} value={pin} onChange={e => change(e.target.value)} inputMode="numeric" pattern="[0-9]*"
            autoComplete="off" maxLength={4} aria-label="4-digit passcode" type="password"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text" />
        </label>
        <p className="h-5 text-sm text-red-600 mb-2">{busy ? 'Signing in…' : err}</p>

        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => k === '' ? <span key={i} /> : (
            <button key={i} disabled={busy}
              onClick={() => change(k === '⌫' ? pin.slice(0, -1) : pin + k)}
              className="py-4 text-xl font-semibold rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-accent-soft">
              {k}
            </button>
          ))}
        </div>
        <p className="hidden sm:block text-xs text-slate-400 mt-4">You can also type your PIN on the keyboard.</p>
      </div>
    </div>
  )
}
