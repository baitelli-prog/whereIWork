# GlassHouse Frontend

Live React app, wired to your Supabase backend.

## Deploy on Vercel (browser-only)

1. Push this `frontend/` folder into your `whereIWork` repo (it can live at the repo root or in a `frontend/` subfolder).
2. On https://vercel.com → **Add New → Project** → import `whereIWork`.
3. If the app is in a subfolder, set **Root Directory** to `frontend`.
4. Framework preset: **Vite** (auto-detected).
5. Add **Environment Variables**:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
   - `VITE_GOOGLE_MAPS_KEY` = (optional, leave blank for now)
6. **Deploy.** You get a live URL. Sign up, log in, use the app.

## Local dev (optional)

```
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

## Notes

- Data is **live**: groups, campaigns, leads, and messages persist in Supabase,
  scoped per company by Row-Level Security. Inbound SMS appears in real time.
- The Reveal screen still uses the stylized prototype map. To switch to the real
  Google Maps version, drop in `RevealMap.jsx` (provided separately) and add
  your `VITE_GOOGLE_MAPS_KEY`.
- Messaging runs in **simulated mode** until you set Twilio/Resend secrets in the
  Supabase dashboard.
