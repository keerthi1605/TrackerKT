# Our Tracker

Shared goal tracker for Keerthi (admin) and Tarun. React + Vite frontend on GitHub Pages, Supabase backend.

**Features:** goals (number / checklist / habit / time), progress logging, streaks 🔥, time tracking (timer + manual),
weekly & monthly charts, progress-vs-pace, realtime sync, 4-digit PIN login (only Keerthi can change it).

## One-time Supabase setup

1. Create a project at supabase.com.
2. **Auth → Providers → Email:** keep enabled; **turn off "Allow new users to sign up"** (only the two accounts should exist).
3. **SQL editor:** paste & run `supabase/migrations/0001_init.sql`. Initial PIN is `1234`.
4. **Auth → Users → Add user** (tick *Auto Confirm*, any strong random password – you never use it). Do this AFTER step 3 so profiles get created:
   - `keerthi@tracker.app`
   - `tarun@tracker.app`
5. Deploy the edge functions (needs the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy pin-login --no-verify-jwt
   supabase functions deploy change-pin --no-verify-jwt
   ```
6. Log in as Keerthi → **Settings → Change login PIN** right away.

## Run locally

```bash
cp .env.example .env     # fill in Project URL + anon key (Project Settings → API)
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → New secret:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Push to `main` — the workflow builds and publishes. Open the URL on both phones and "Add to Home Screen".

## Security notes

- The anon key is public by design. Data is protected by Row Level Security: only signed-in users (the two accounts) can read/write.
- The PIN is checked server-side (bcrypt hash in a private table); 5 wrong tries locks login for 15 minutes.
- A 4-digit PIN is weak against a determined attacker even with lockout — don't store anything sensitive here.
- Never commit the `service_role` key (not needed in the frontend).
