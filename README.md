# GlassHouse Backend (Supabase)

This is the backend skeleton: a Postgres schema, the `prospects` Edge Function
your map calls, and the frontend client snippet. It runs end-to-end with mock
data today, so the *pipe* works before you sign up for a property provider.

```
backend/
├─ supabase/
│  ├─ config.toml                  project config
│  ├─ migrations/
│  │  └─ 0001_init.sql             all tables + Row-Level Security
│  └─ functions/
│     ├─ _shared/cors.ts           CORS headers
│     └─ prospects/index.ts        the endpoint RevealMap calls
└─ frontend-snippet/
   └─ supabase.js                  drop into your React app's src/lib/
```

## One-time setup

```bash
# 1. install the CLI
npm install -g supabase

# 2. create a project at https://database.new  (note the project ref + db password)

# 3. from this backend/ folder, link and push the schema
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                       # applies 0001_init.sql

# 4. deploy the function
supabase functions deploy prospects

# 5. (later) point the function at a real data provider
supabase secrets set PROPERTY_API_KEY=xxxx PROPERTY_API_URL=https://api.yourprovider.com
```

## Wire the map to it

1. `npm install @supabase/supabase-js` in your React app.
2. Copy `frontend-snippet/supabase.js` to `src/lib/supabase.js`.
3. Add to your app's `.env`:
   ```
   VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...          # public anon key, safe in browser
   ```
4. In `RevealMap.jsx`, delete the local mock `fetchProspectsInArea` and instead
   `import { fetchProspectsInArea } from "./lib/supabase";`

Now drawing an area calls *your* server, which calls the property API and scrubs
DNC before anything reaches the browser.

## Auth (login / signup) — DONE ✅

Run the second migration and drop in the auth files:

```bash
supabase db push          # applies 0002_auth_bootstrap.sql (auto-creates company on signup)
npm install @supabase/supabase-js
```

Copy into your React app's `src/`:
- `frontend-snippet/Auth.jsx`        → `src/Auth.jsx`
- `frontend-snippet/supabase.js`     → `src/lib/supabase.js`
- `frontend-snippet/main.jsx`        → merge into your `src/main.jsx`

That wraps the whole app in `<AuthGate>`: signed-out users see a branded
login/signup screen; signed-in users see the app. On signup, the `0002`
trigger creates their company + owner membership, so Row-Level Security works
from the first second — they only ever see their own data.

Email confirmation is on by default in Supabase. For local testing you can turn
it off under Authentication → Providers → Email, or use the magic-link flow.

## SMS + email messaging — DONE ✅

```bash
supabase db push    # applies 0003_messaging.sql (opt-out tracking + suppressions)

# deploy the messaging functions
supabase functions deploy send-campaign
supabase functions deploy send-reply
supabase functions deploy sms-inbound --no-verify-jwt   # Twilio can't send a JWT

# secrets (set what you have; missing ones fall back to SIMULATED sends)
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxx \
  TWILIO_AUTH_TOKEN=xxxx \
  TWILIO_FROM_NUMBER=+1XXXXXXXXXX_or_MGxxxx \
  RESEND_API_KEY=re_xxxx \
  EMAIL_FROM="Your Co <hello@yourdomain.com>" \
  SMS_INBOUND_URL=https://YOUR_REF.supabase.co/functions/v1/sms-inbound \
  SUPABASE_SERVICE_ROLE_KEY=eyJ...   # from project settings → API
```

Then in the **Twilio console**, set your number's "A MESSAGE COMES IN" webhook
(HTTP POST) to your `sms-inbound` function URL. Inbound texts now flow into the
`messages` table and show up on your Sales Board.

What each function does:
- **send-campaign** — sends SMS/email to every *contactable* prospect in a group
  (skips DNC, prior opt-outs, and the suppression list), then creates the
  campaign, a lead per recipient, and the outbound message rows.
- **sms-inbound** — Twilio webhook. Validates the `X-Twilio-Signature`, handles
  STOP/START (writes to `suppressions`, flips `opted_out`), and records replies.
- **send-reply** — sends a one-off reply to a lead from the board thread.

Frontend calls (all via `supabase.functions.invoke`):
```js
await supabase.functions.invoke("send-campaign",
  { body: { group_id, channel: "sms", template, body, subject } });
await supabase.functions.invoke("send-reply", { body: { lead_id, body: text } });
```

> Everything runs in **simulated** mode until you set the Twilio/Resend secrets,
> so you can wire and test the whole flow before paying for a number.

## Compliance — read before going live

- **Opt-out is enforced in code** (DNC flag + suppression list + Twilio's own
  STOP blocking). Leave those checks in.
- **A2P 10DLC registration is required** for US business SMS — register your
  brand + campaign in the Twilio console *before* sending volume; carriers
  filter unregistered traffic. It can take several days.
- **TCPA**: you generally need prior express consent to text consumers, and
  there are quiet-hours and identification rules. Talk to a lawyer. I'm not one.

## Port the prototype UI to live data — DONE ✅

The hook `useGlassHouse()` returns the same shapes your prototype's `App`
already uses, so wiring is mostly deleting in-memory state. See
`frontend-snippet/INTEGRATION.md` for the exact, step-by-step edits.

Add to your React app:
```
src/lib/db.js                all queries + realtime subscription
src/hooks/useGlassHouse.js   the live-data hook
```
Then in `App`, replace the `useState`/`window.storage`/`simulateReplies` block
with `const { groups, campaigns, leads, createGroup, sendCampaign, sendReply,
moveLead, bookLead, markRead } = useGlassHouse();` — handler names match, so the
rest of the UI is unchanged.

The win: real inbound texts arrive via `sms-inbound`, and a **realtime
subscription pushes them to the board live** — the simulated replies are gone,
replaced by the real thing. Reload or switch devices and the data persists
(RLS-scoped per company).

## That's the full stack

Map → backend → auth → messaging → live UI. Remaining real-world to-dos are
operational, not code: set the Twilio/Resend/property-API secrets, complete
**A2P 10DLC registration**, and get **TCPA legal review** before real sends.

## Compliance reminder

The function scrubs `dnc`-flagged records before returning them — leave that in.
Real outbound SMS also requires A2P 10DLC registration and TCPA compliance.
Get legal advice before sending real messages.
