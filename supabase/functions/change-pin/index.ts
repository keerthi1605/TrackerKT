// Edge function: only the admin (Keerthi) can change the shared PIN.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { pin } = await req.json()
    if (!/^[0-9]{4}$/.test(String(pin))) return json({ error: 'PIN must be 4 digits' }, 400)

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user) return json({ error: 'Not signed in' }, 401)

    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', u.user.id).single()
    if (!profile?.is_admin) return json({ error: 'Only the admin can change the PIN' }, 403)

    const { error } = await admin.rpc('set_pin', { p: String(pin) })
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  } catch {
    return json({ error: 'Bad request' }, 400)
  }
})
