// src/lib/supabase.js — frontend Supabase client + prospect lookup.
//
// Install:  npm install @supabase/supabase-js
// .env:     VITE_SUPABASE_URL=https://xxxx.supabase.co
//           VITE_SUPABASE_ANON_KEY=eyJ...   (the public anon key — safe in the browser)

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// This is the function RevealMap imports. It replaces the mock
// `fetchProspectsInArea` that's currently inside RevealMap.jsx.
//
// In RevealMap.jsx, change:
//     async function fetchProspectsInArea({ bounds, path }) { ...mock... }
// to:
//     import { fetchProspectsInArea } from "./lib/supabase";
// and delete the local mock.
export async function fetchProspectsInArea({ bounds, path }) {
  const { data, error } = await supabase.functions.invoke("prospects", {
    body: { bounds, path },
  });
  if (error) throw error;
  // backend already scrubbed DNC; map fields to what the UI expects
  return (data.prospects || []).map((p, i) => ({
    id: "p" + i,
    name: p.name,
    addr: p.address,
    phone: p.phone,
    value: p.home_value,
    equity: p.equity,
    beds: p.beds,
    sqft: p.sqft,
    year: p.year_built,
    lat: p.lat,
    lng: p.lng,
  }));
}
