# Wiring the prototype to live data

The hook `useGlassHouse()` returns the **same shapes** your prototype already
uses (`groups`, `campaigns`, `leads` with `{ jackie, needsAttention, booked }`),
so integration is mostly deleting in-memory state and reading from the hook.

## Files to add to your React app
```
src/lib/supabase.js          (from earlier — auth + prospect lookup)
src/lib/db.js                all queries + realtime
src/hooks/useGlassHouse.js   the live-data hook
src/Auth.jsx                 the login gate
```
Install: `npm install @supabase/supabase-js`

## Changes in GlassHouse.jsx (the `App` component)

### 1. Replace the in-memory state block

DELETE these (and the `simulateReplies`, `REPLIES`, `DEFAULT_LEADS`,
`window.storage` load/save effects, and `resetAll` — all no longer needed):

```js
const [groups, setGroups] = useState([]);
const [campaigns, setCampaigns] = useState([]);
const [leads, setLeads] = useState(DEFAULT_LEADS);
// ...all the persistence useEffects, simulateReplies, etc.
```

ADD:

```js
import { useGlassHouse } from "./hooks/useGlassHouse";
// ...
const {
  groups, campaigns, leads, loading,
  createGroup, sendCampaign, sendReply, moveLead, bookLead, markRead,
} = useGlassHouse();

const [openLeadId, setOpenLeadId] = useState(null);
const [focusLeadId, setFocusLeadId] = useState(null);
```

### 2. Rewire the handlers to the async versions

| Prototype handler | Now |
|---|---|
| `addGroup(g)` | `createGroup(g)` (the map already passes `{name, contacts, prospects}`) |
| `sendCampaign(payload)` | `sendCampaign(payload)` — same name, now hits the edge function |
| `sendReply(id, text)` | `sendReply(id, text)` — same name |
| `moveLead(id, col)` | `moveLead(id, col)` — same name |
| `bookLead(id)` | `bookLead(id)` — same name |
| `openLead(id)` | keep local: `setOpenLeadId(id); markRead(id);` |

`simulateReplies` is **gone** — real inbound texts arrive through the realtime
subscription and appear on the board on their own.

### 3. Derived values stay the same
`allLeads`, `findLead`, `openLeadObj`, `focusLeadObj`, `sentGroupNames` all work
unchanged because the data shapes match. Drop the `useMemo` dependency on
`window.storage`.

### 4. Loading state
Wrap the board so it doesn't flash empty:
```js
if (loading) return <YourSpinner/>;  // or a simple "Loading board…"
```

### 5. The map (`RevealMap.jsx`)
Pass `onCreateGroup={createGroup}` instead of the old prototype handler. The map
already collects `{ name, prospects }` in its review panel; `createGroup` writes
the group + prospects to Supabase.

> Coordinate note: the prototype used SVG x/y. With the real Google map you have
> real `lat`/`lng` on every prospect and lead. `db.js` stores them; pins should
> use `lat`/`lng` with `google.maps.Marker` (as in RevealMap), not the old SVG
> coords. The two-way "view on map" then centers the map via `map.panTo({lat,lng})`.

## What you get after this
- Draw on the map → group + prospects persist in Postgres.
- Send a campaign → real SMS/email (or simulated until secrets are set),
  leads created server-side, board updates.
- A prospect texts back → `sms-inbound` records it → **realtime pushes it to the
  board live**, no refresh, no simulation.
- Reply / drag-to-booked → writes straight to the database.
- Reload, switch devices, or have a teammate log in → same data (RLS-scoped).

That's the prototype, now running on the real backend.
