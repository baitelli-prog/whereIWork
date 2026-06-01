// supabase/functions/prospects/index.ts
//
// The endpoint the RevealMap calls after a user draws an area.
// Flow:  browser  ->  THIS function  ->  property/skip-trace API  ->  browser
//
// Why server-side:
//   1. Your data-provider API key stays secret (never shipped to the browser).
//   2. DNC / TCPA scrubbing happens in ONE place you control.
//
// Deploy:   supabase functions deploy prospects
// Secrets:  supabase secrets set PROPERTY_API_KEY=xxxx PROPERTY_API_URL=https://...
// Call:     POST { bounds: { north, south, east, west }, path?: [{lat,lng}] }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface Bounds { north: number; south: number; east: number; west: number; }

Deno.serve(async (req) => {
  // CORS preflight — MUST come first.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    const { bounds, path } = await req.json();
    if (!bounds) return json({ error: "missing bounds" }, 400);

    const raw = await lookupProperties(bounds, path);

    // DNC / TCPA scrub: drop anything flagged do-not-call. Do NOT remove this.
    const contactable = raw.filter((p) => !p.dnc);

    return json({ prospects: contactable, total: raw.length, removed: raw.length - contactable.length });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// DATA SEAM — swap the mock for a real provider when you're ready.
// ---------------------------------------------------------------------------
async function lookupProperties(bounds: Bounds, _path?: { lat: number; lng: number }[]) {
  const API_KEY = Deno.env.get("PROPERTY_API_KEY");
  const API_URL = Deno.env.get("PROPERTY_API_URL");

  // If no provider configured yet, return mock data so the pipe works end-to-end.
  if (!API_KEY || !API_URL) {
    return mockProperties(bounds);
  }

  // ---- REAL CALL (shape depends on your provider; this is the BatchData-style pattern) ----
  // const res = await fetch(`${API_URL}/property/search`, {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     boundary: { northeast: { lat: bounds.north, lng: bounds.east },
  //                 southwest: { lat: bounds.south, lng: bounds.west } },
  //     options: { skip_trace: true, dnc: true },
  //   }),
  // });
  // if (!res.ok) throw new Error(`property API ${res.status}`);
  // const data = await res.json();
  // return data.results.map((r) => ({
  //   name: r.owner?.name, address: r.address?.full, phone: r.owner?.phones?.[0]?.number,
  //   email: r.owner?.emails?.[0], home_value: r.valuation?.estimate, equity: r.valuation?.equity,
  //   beds: r.building?.beds, sqft: r.building?.sqft, year_built: r.building?.year_built,
  //   lat: r.location?.lat, lng: r.location?.lng, dnc: !!r.owner?.phones?.[0]?.dnc,
  // }));

  return mockProperties(bounds); // remove once the real call above is enabled
}

function mockProperties(b: Bounds) {
  const names = ["A. Carter", "M. Nguyen", "R. Patel", "L. Reyes", "J. Brooks", "S. Flores", "D. Cole", "K. Hughes"];
  const streets = ["Reymont St", "Oak Quarry Dr", "Crest Ave", "Heron Bay", "Maple Glen"];
  const out = [];
  const n = 6 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) {
    const value = Math.round(280 + Math.random() * 620) * 1000;
    out.push({
      name: names[i % names.length],
      address: `${100 + Math.floor(Math.random() * 9899)} ${streets[i % streets.length]}`,
      phone: `(407) ${200 + Math.floor(Math.random() * 799)}-${1000 + Math.floor(Math.random() * 8999)}`,
      email: null,
      home_value: value,
      equity: Math.round(value * (0.3 + Math.random() * 0.5)),
      beds: 2 + Math.floor(Math.random() * 4),
      sqft: 1200 + Math.floor(Math.random() * 2600),
      year_built: 1975 + Math.floor(Math.random() * 48),
      lat: b.south + Math.random() * (b.north - b.south),
      lng: b.west + Math.random() * (b.east - b.west),
      dnc: Math.random() < 0.12, // ~12% flagged do-not-call, to prove the scrub works
    });
  }
  return out;
}
