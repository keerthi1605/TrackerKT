// Edge function: verify the shared 4-digit PIN and hand back a one-time token the browser
// exchanges for a real Supabase session (supabase.auth.verifyOtp). Includes brute-force lockout.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const USERS: Record<string, string> = {
  keerthi: 'keerthi@tracker.app',
  tarun: 'tarun@tracker.app',
}
const MAX_FAILS = 5
const WINDOW_MIN = 15

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { user, pin } = await req.json()
    const email = USERS[String(user)]
    if (!email || !/^[0-9]{4}$/.test(String(pin))) return json({ error: 'Invalid request' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // lockout: count recent failures across both names (the PIN is shared)
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString()
    const { count } = await admin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', since)
    if ((count ?? 0) >= MAX_FAILS) {
      return json({ error: `Too many wrong tries. Wait ${WINDOW_MIN} minutes.` }, 429)
    }

    const { data: ok } = await admin.rpc('check_pin', { p: String(pin) })
    await admin.from('login_attempts').insert({ user_name: user, success: !!ok })
    if (!ok) {
      const left = Math.max(0, MAX_FAILS - 1 - (count ?? 0))
      return json({ error: `Wrong PIN. ${left} tries left.` }, 401)
    }
    await admin.from('login_attempts').delete().eq('success', false)

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.hashed_token) return json({ error: 'Could not create session' }, 500)
    return json({ token_hash: data.properties.hashed_token })
  } catch {
    return json({ error: 'Bad request' }, 400)
  }
})
