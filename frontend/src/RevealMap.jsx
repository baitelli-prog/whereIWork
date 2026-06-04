import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";

/* RevealMap — draw an area, sample real addresses (Google reverse-geocode),
   then "Reveal" to enrich them with real owner data via Tracerfy.
   Phase 1: draw -> grid-sample points inside -> reverse-geocode -> dedupe -> candidates.
   Phase 2: Reveal -> enrich-prospect per address (Tracerfy $0.20/hit) -> real owners.
   Only revealed owners can become a group. Env: VITE_GOOGLE_MAPS_KEY */

const C = { accent: "#c2632a", ink: "#1d2939", sub: "#667085", line: "#e7e3dd", green: "#0a8a4a", red: "#b42318" };
const ORLANDO = { lat: 28.5384, lng: -81.3789 };
const MAX_POINTS = 60;
const MAX_TRACES = 2000;  // hard cap on Tracerfy lookups per group ($0.20 each = $400 max)
const GRID = 8;

let _mapsPromise = null;
function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = "__ghMapsInit_" + Math.random().toString(36).slice(2);
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${cb}&v=weekly&loading=async`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

export default function RevealMap({ onCreateGroup, boardLeads = [], focusLead, onOpenLead }) {
  const mapEl = useRef(null);
  const map = useRef(null);
  const maps = useRef(null);
  const geocoder = useRef(null);
  const points = useRef([]);
  const tempPath = useRef(null);
  const vertexDots = useRef([]);
  const polygon = useRef(null);
  const leadPins = useRef([]);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [candidates, setCandidates] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [excluded, setExcluded] = useState({});
  const [groupName, setGroupName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [offer, setOffer] = useState("We're painting homes in {neighborhood} this month — ask about your free quote.");
  const [created, setCreated] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [note, setNote] = useState("");

  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!key) { setErr("no-key"); return; }
    let dead = false;
    loadMaps(key).then((m) => {
      if (dead) return;
      maps.current = m;
      geocoder.current = new m.Geocoder();
      map.current = new m.Map(mapEl.current, {
        center: ORLANDO, zoom: 13, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, clickableIcons: false,
      });
      setReady(true);
    }).catch(() => setErr("load-failed"));
    return () => { dead = true; };
  }, [key]);

  const reverseGeocode = (pt) => new Promise((resolve, reject) => {
    geocoder.current.geocode({ location: pt }, (results, status) => {
      if (status !== "OK" || !results?.length) return reject(status);
      const r = results.find((x) => x.types.includes("street_address")) || results[0];
      const get = (type) => r.address_components.find((c) => c.types.includes(type))?.long_name || "";
      const streetNum = get("street_number");
      const route = get("route");
      if (!streetNum || !route) return reject("not-a-street-address");
      const addr = `${streetNum} ${route}`;
      const city = get("locality") || get("sublocality") || get("administrative_area_level_2");
      const state = r.address_components.find((c) => c.types.includes("administrative_area_level_1"))?.short_name || "";
      const zip = get("postal_code");
      resolve({ id: addr + "|" + zip, key: (addr + city + zip).toLowerCase(), addr, city, state, zip,
        lat: r.geometry.location.lat(), lng: r.geometry.location.lng() });
    });
  });

  const sampleAddresses = useCallback(async (path) => {
    const m = maps.current;
    const poly = new m.Polygon({ paths: path });
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    path.forEach((p) => { minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); });
    const inside = [];
    for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) {
      const lat = minLat + (i / GRID) * (maxLat - minLat);
      const lng = minLng + (j / GRID) * (maxLng - minLng);
      if (m.geometry.poly.containsLocation(new m.LatLng(lat, lng), poly)) inside.push({ lat, lng });
    }
    poly.setMap(null);
    const sampled = inside.slice(0, MAX_POINTS);
    setPhase("sampling");
    setProgress({ done: 0, total: sampled.length });
    setNote(inside.length > MAX_POINTS ? `Area is large — sampling ${MAX_POINTS} of ~${inside.length} points.` : "");
    const seen = new Set(); const out = [];
    for (let k = 0; k < sampled.length; k++) {
      try { const addr = await reverseGeocode(sampled[k]); if (addr && !seen.has(addr.key)) { seen.add(addr.key); out.push(addr); } } catch {}
      setProgress({ done: k + 1, total: sampled.length });
    }
    setCandidates(out); setExcluded({}); setRevealed([]); setCreated(false); setPhase("candidates");
    if (!out.length) setNote("No addresses resolved here — try a denser residential block.");
  }, []);

  const reveal = useCallback(async () => {
    let list = candidates.filter((c) => !excluded[c.id]);
    if (!list.length) return;
    if (list.length > MAX_TRACES) {
      list = list.slice(0, MAX_TRACES);
      setNote(`Capped at ${MAX_TRACES} traces (max $${(MAX_TRACES * 0.2).toFixed(0)}) for this group.`);
    }
    setPhase("revealing");
    setProgress({ done: 0, total: list.length });
    const out = [];
    for (let k = 0; k < list.length; k++) {
      const c = list[k];
      try {
        const { data, error } = await supabase.functions.invoke("enrich-prospect", { body: { address: c.addr, city: c.city, state: c.state, zip: c.zip } });
        if (!error && data?.found) out.push({
          id: c.id, name: data.name || "(owner unknown)", addr: `${c.addr}, ${c.city}, ${c.state} ${c.zip}`,
          phone: data.phone, email: data.email, dnc: data.dnc, litigator: data.litigator,
          value: data.home_value, equity: data.equity, beds: data.beds, sqft: data.sqft, year: data.year_built,
          lat: data.lat ?? c.lat, lng: data.lng ?? c.lng, roofCat: data.roof_category, ownerOccupied: data.owner_occupied,
        });
      } catch {}
      setProgress({ done: k + 1, total: list.length });
    }
    setRevealed(out); setExcluded({}); setPhase("revealed");
    setNote(out.length ? "" : "No owners found for these addresses (not in Tracerfy's database).");
  }, [candidates, excluded]);

  const finishShape = useCallback((path) => {
    const m = maps.current;
    if (polygon.current) polygon.current.setMap(null);
    polygon.current = new m.Polygon({ paths: path, map: map.current, strokeColor: C.accent, strokeWeight: 2, fillColor: C.accent, fillOpacity: 0.12, clickable: false });
    sampleAddresses(path);
  }, [sampleAddresses]);

  const clearDrawing = useCallback(() => {
    points.current = [];
    if (tempPath.current) { tempPath.current.setMap(null); tempPath.current = null; }
    vertexDots.current.forEach((d) => d.setMap(null)); vertexDots.current = [];
    if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }
    setCandidates([]); setRevealed([]); setExcluded({}); setGroupName(""); setCreated(false); setMode(null); setPhase("idle"); setNote("");
  }, []);

  useEffect(() => {
    if (!ready || mode !== "polygon") return;
    const m = maps.current, gmap = map.current;
    if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }
    points.current = [];
    const clickL = gmap.addListener("click", (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      points.current.push(pt);
      const dot = new m.Marker({ position: pt, map: gmap, icon: { path: m.SymbolPath.CIRCLE, scale: 5, fillColor: C.accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      vertexDots.current.push(dot);
      if (tempPath.current) tempPath.current.setMap(null);
      tempPath.current = new m.Polyline({ path: points.current, map: gmap, strokeColor: C.accent, strokeWeight: 2 });
    });
    const dblL = gmap.addListener("dblclick", () => {
      if (points.current.length >= 3) {
        const path = [...points.current];
        if (tempPath.current) { tempPath.current.setMap(null); tempPath.current = null; }
        vertexDots.current.forEach((d) => d.setMap(null)); vertexDots.current = [];
        setMode(null); finishShape(path);
      }
    });
    return () => { clickL.remove(); dblL.remove(); };
  }, [ready, mode, finishShape]);

  useEffect(() => {
    if (!ready || mode !== "box") return;
    const m = maps.current, gmap = map.current;
    let first = null, rect = null;
    if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }
    const clickL = gmap.addListener("click", (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (!first) { first = pt; return; }
      const path = [{ lat: first.lat, lng: first.lng }, { lat: first.lat, lng: pt.lng }, { lat: pt.lat, lng: pt.lng }, { lat: pt.lat, lng: first.lng }];
      setMode(null); if (rect) rect.setMap(null); finishShape(path);
    });
    const moveL = gmap.addListener("mousemove", (e) => {
      if (!first) return;
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const path = [{ lat: first.lat, lng: first.lng }, { lat: first.lat, lng: pt.lng }, { lat: pt.lat, lng: pt.lng }, { lat: pt.lat, lng: first.lng }];
      if (rect) rect.setMap(null);
      rect = new m.Polygon({ paths: path, map: gmap, strokeColor: C.accent, strokeWeight: 2, fillColor: C.accent, fillOpacity: 0.1, clickable: false });
    });
    return () => { clickL.remove(); moveL.remove(); if (rect) rect.setMap(null); };
  }, [ready, mode, finishShape]);

  useEffect(() => {
    if (!ready) return;
    const m = maps.current;
    leadPins.current.forEach((p) => p.setMap(null)); leadPins.current = [];
    const color = { jackie: "#7c3aed", needsAttention: C.accent, booked: C.green };
    boardLeads.forEach((l) => {
      if (l.lat == null || l.lng == null) return;
      const pin = new m.Marker({ position: { lat: l.lat, lng: l.lng }, map: map.current, title: l.name, icon: { path: m.SymbolPath.CIRCLE, scale: 7, fillColor: color[l.stage] || C.accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      pin.addListener("click", () => onOpenLead && onOpenLead(l.id));
      leadPins.current.push(pin);
    });
  }, [ready, boardLeads, onOpenLead]);

  useEffect(() => {
    if (!ready || !focusLead || focusLead.lat == null) return;
    map.current.panTo({ lat: focusLead.lat, lng: focusLead.lng });
    map.current.setZoom(16);
  }, [ready, focusLead]);

  const includedRevealed = revealed.filter((r) => !excluded[r.id]);

  const offerText = () => offer.replace(/\{neighborhood\}/g, neighborhood || groupName || "your neighborhood");

  // direct-mail CSV: name, address split, offer line — ready for Lob/printer mail-merge
  const exportCSV = () => {
    const rows = [["first_name", "last_name", "full_name", "address", "city", "state", "zip", "phone", "neighborhood", "offer"]];
    includedRevealed.forEach((r) => {
      const parts = (r.name || "").trim().split(" ");
      const first = parts[0] || "";
      const last = parts.slice(1).join(" ");
      // r.addr is "123 Main St, Orlando, FL 32801"
      const [street, city, stateZip] = (r.addr || "").split(",").map((s) => s.trim());
      const [st, zip] = (stateZip || "").split(" ").filter(Boolean);
      // only include a phone that is safe to contact: enrich-prospect already
      // sets r.phone to the best non-DNC, non-litigator number (null otherwise).
      const safePhone = r.dnc ? "" : (r.phone || "");
      rows.push([first, last, r.name || "", street || "", city || "", st || "", zip || "", safePhone, neighborhood || "", offerText()]);
    });
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(groupName || "neighborhood").replace(/\s+/g, "-")}-mail-list.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // printable postcard sheet (front of card) — opens in a new tab to print/PDF
  const openPostcard = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const cards = includedRevealed.map((r) => {
      const [street, city, stateZip] = (r.addr || "").split(",").map((s) => s.trim());
      return `<div class="card">
        <div class="brand">WOW 1 DAY PAINTING</div>
        <div class="offer">${offerText()}</div>
        <div class="addr">${r.name || ""}<br>${street || ""}<br>${city || ""}${stateZip ? ", " + stateZip : ""}</div>
      </div>`;
    }).join("");
    w.document.write(`<!doctype html><html><head><title>Postcards — ${neighborhood || groupName}</title>
      <style>
        @page { size: letter; margin: 0.4in; }
        body { font-family: Georgia, serif; margin: 0; }
        .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3in; padding: 0.3in; }
        .card { border: 1px dashed #bbb; border-radius: 10px; padding: 18px; height: 3.6in; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
        .brand { font-weight: bold; letter-spacing: 1px; color: #c2632a; font-size: 15px; }
        .offer { font-size: 20px; line-height: 1.3; color: #1d2939; }
        .addr { font-size: 13px; color: #475467; }
      </style></head><body><div class="sheet">${cards}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const includedCand = candidates.filter((c) => !excluded[c.id]);

  const create = async () => {
    if (!includedRevealed.length) return;
    setCreated("saving");
    try {
      await onCreateGroup({
        name: groupName.trim() || `Reveal ${new Date().toLocaleDateString()}`,
        contacts: includedRevealed.length, source: "Reveal",
        prospects: includedRevealed.map((r) => ({ name: r.name, addr: r.addr, phone: r.phone, email: r.email, value: r.value, equity: r.equity, beds: r.beds, sqft: r.sqft, year: r.year, lat: r.lat, lng: r.lng })),
      });
      setCreated(true);
    } catch { setCreated(false); }
  };

  if (err === "no-key") return <div style={{ padding: 40, fontFamily: "system-ui", color: C.sub }}><h3 style={{ color: C.ink }}>Google Maps key not set</h3><p>Add <code>VITE_GOOGLE_MAPS_KEY</code> in Vercel, then redeploy.</p></div>;

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 40px)", fontFamily: "system-ui" }}>
      <div style={{ flex: 1, position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", zIndex: 5, top: 14, left: 14, display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "85%" }}>
          <Btn on={mode === "polygon"} onClick={() => setMode("polygon")}>✎ Draw polygon</Btn>
          <Btn on={mode === "box"} onClick={() => setMode("box")}>▭ Draw box</Btn>
          <Btn onClick={clearDrawing}>↺ Clear</Btn>
          {mode && <span style={{ alignSelf: "center", background: "#1d2939", color: "#fff", fontSize: 12.5, padding: "6px 10px", borderRadius: 8 }}>{mode === "polygon" ? "Click points · double-click to close" : "Click two corners"}</span>}
        </div>
        <div ref={mapEl} style={{ width: "100%", height: "100%", background: "#e9eef2" }} />
        {!ready && !err && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.sub }}>Loading map…</div>}
        {err === "load-failed" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.red }}>Map failed to load — check the key & allowed referrers.</div>}
      </div>

      <div style={{ width: 380, border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ color: C.ink }}>Prospect Group</strong>
          <span style={{ color: C.accent, fontWeight: 700 }}>{phase === "revealed" ? includedRevealed.length : includedCand.length}</span>
        </div>
        {note && <div style={{ padding: "10px 16px", fontSize: 12.5, color: C.sub, background: "#fbf7f2" }}>{note}</div>}
        {phase === "sampling" && <Progress label="Finding addresses in area…" {...progress} />}
        {phase === "revealing" && <Progress label="Revealing owners (Tracerfy)…" {...progress} />}
        {phase === "idle" && <div style={{ padding: 30, color: C.sub, textAlign: "center", margin: "auto" }}>Pick <b>Draw polygon</b> or <b>Draw box</b>, then outline an area. We'll find the addresses inside, then you Reveal the owners.</div>}

        {phase === "candidates" && (<>
          <div style={{ overflowY: "auto", flex: 1, padding: 12 }}>
            {candidates.map((c) => { const off = excluded[c.id]; return (
              <div key={c.id} style={{ border: `1px solid ${off ? C.line : C.accent}`, opacity: off ? 0.5 : 1, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.ink, fontWeight: 600 }}>{c.addr}</span>
                  <button onClick={() => setExcluded((p) => ({ ...p, [c.id]: !p[c.id] }))} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}>{off ? "undo" : "🗑"}</button>
                </div>
                <div style={{ fontSize: 12.5, color: C.sub }}>{c.city}, {c.state} {c.zip}</div>
              </div>); })}
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>{includedCand.length} addresses · ~$0.20 each to reveal (charged only on a match)</div>
            <button onClick={reveal} disabled={!includedCand.length} style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Reveal {includedCand.length} owners</button>
          </div>
        </>)}

        {phase === "revealed" && (<>
          <div style={{ overflowY: "auto", flex: 1, padding: 12 }}>
            {revealed.map((r) => { const off = excluded[r.id]; return (
              <div key={r.id} style={{ border: `1px solid ${off ? C.line : C.accent}`, opacity: off ? 0.5 : 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: C.ink }}>{r.name}</strong>
                  <button onClick={() => setExcluded((p) => ({ ...p, [r.id]: !p[r.id] }))} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}>{off ? "undo" : "🗑"}</button>
                </div>
                <div style={{ fontSize: 13, color: C.sub, margin: "4px 0" }}>{r.addr}</div>
                <div style={{ fontSize: 13, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {r.phone ? <span>📞 {r.phone}</span> : <span style={{ color: C.red }}>no callable #</span>}
                  {r.value ? <span>${Math.round(r.value / 1000)}k</span> : null}
                  {r.dnc && <span style={{ background: "#fde8e8", color: C.red, fontSize: 11, padding: "1px 6px", borderRadius: 6 }}>DNC</span>}
                  {r.roofCat && <span style={{ background: "#eef2ff", color: "#3538cd", fontSize: 11, padding: "1px 6px", borderRadius: 6 }}>roof: {r.roofCat}</span>}
                </div>
              </div>); })}
            {!revealed.length && <div style={{ padding: 24, color: C.sub, textAlign: "center" }}>No owners revealed.</div>}
          </div>
          {revealed.length > 0 && (
            <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Laureate Q2)" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 8, fontSize: 14 }} />
              <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Neighborhood name (e.g. VillageWalk)" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 8, fontSize: 14 }} />
              <textarea value={offer} onChange={(e) => setOffer(e.target.value)} rows={2} placeholder="Offer line — use {neighborhood}" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
              <button onClick={create} disabled={!includedRevealed.length || created === "saving" || created === true} style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: created === true ? C.green : C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 8 }}>{created === true ? "✓ Group created" : created === "saving" ? "Saving…" : `Create Group (${includedRevealed.length})`}</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportCSV} disabled={!includedRevealed.length} style={{ flex: 1, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", color: C.ink, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>⬇ Mail list (CSV)</button>
                <button onClick={openPostcard} disabled={!includedRevealed.length} style={{ flex: 1, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", color: C.ink, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🖨 Postcards</button>
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

function Progress({ label, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (<div style={{ padding: 24, margin: "auto", textAlign: "center", color: C.sub }}>
    <div style={{ marginBottom: 10 }}>{label}</div>
    <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: C.accent, transition: "width .2s" }} /></div>
    <div style={{ fontSize: 12.5, marginTop: 6 }}>{done} / {total}</div>
  </div>);
}
function Btn({ children, on, onClick }) {
  return <button onClick={onClick} style={{ padding: "9px 13px", border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accent : "#fff", color: on ? "#fff" : C.ink, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{children}</button>;
}
