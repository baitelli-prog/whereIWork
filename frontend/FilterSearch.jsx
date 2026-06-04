import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

/* FilterSearch — Tracerfy Lead Builder mode. Filter by criteria (pool, etc.)
   in a radius or ZIPs, PREVIEW for free (count + max cost), then EXECUTE to
   pay only for matching homes (5 credits = $0.10 each). Async: polls status,
   then loads rows. Feeds revealed owners into the same createGroup flow. */

const C = { accent: "#c2632a", ink: "#1d2939", sub: "#667085", line: "#e7e3dd", green: "#0a8a4a", red: "#b42318", panel: "#faf8f5" };
const ORLANDO = { lat: 28.5384, lng: -81.3789 };

let _mapsPromise = null;
function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = "__ghMapsFS_" + Math.random().toString(36).slice(2);
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${cb}&v=weekly&loading=async`;
    s.async = true; s.onerror = () => reject(new Error("maps failed"));
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

const call = async (payload) => {
  const { data, error } = await supabase.functions.invoke("leadbuilder", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error + (data.detail ? ": " + JSON.stringify(data.detail) : ""));
  return data;
};

export default function FilterSearch({ onCreateGroup }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const mapEl = useRef(null);
  const map = useRef(null);
  const maps = useRef(null);
  const centerMarker = useRef(null);
  const circle = useRef(null);
  const pins = useRef([]);

  const [ready, setReady] = useState(false);
  const [areaMode, setAreaMode] = useState("radius"); // radius | zips
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(2);
  const [zips, setZips] = useState("");
  // filters
  const [pool, setPool] = useState(true);
  const [ownerOccupied, setOwnerOccupied] = useState(false);
  const [requested, setRequested] = useState(500);
  // flow
  const [phase, setPhase] = useState("idle"); // idle|previewing|previewed|executing|done
  const [preview, setPreview] = useState(null);
  const [job, setJob] = useState(null);
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState(0);
  const [rows, setRows] = useState([]);
  const [excluded, setExcluded] = useState({});
  const [groupName, setGroupName] = useState("");
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!key) return;
    let dead = false;
    loadMaps(key).then((m) => {
      if (dead) return;
      maps.current = m;
      map.current = new m.Map(mapEl.current, { center: ORLANDO, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false });
      map.current.addListener("click", (e) => setCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
      setReady(true);
    }).catch(() => setErr("Map failed to load"));
    return () => { dead = true; };
  }, [key]);

  useEffect(() => {
    if (!ready || areaMode !== "radius") return;
    const m = maps.current;
    if (centerMarker.current) centerMarker.current.setMap(null);
    if (circle.current) circle.current.setMap(null);
    if (!center) return;
    centerMarker.current = new m.Marker({ position: center, map: map.current, icon: { path: m.SymbolPath.CIRCLE, scale: 6, fillColor: C.accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
    circle.current = new m.Circle({ center, radius: radius * 1609.34, map: map.current, strokeColor: C.accent, strokeWeight: 2, fillColor: C.accent, fillOpacity: 0.08 });
    map.current.panTo(center);
  }, [ready, center, radius, areaMode]);

  const filterOverrides = () => {
    const f = {};
    if (pool) f.pool = true;
    if (ownerOccupied) f.owner_occupied = true;
    return f;
  };
  const geo = () => areaMode === "radius"
    ? { mode: "radius", latitude: center?.lat, longitude: center?.lng, radius }
    : { mode: "zips", zip_codes: zips.split(/[\s,]+/).filter(Boolean) };

  const canSearch = areaMode === "radius" ? !!center : zips.trim().length >= 3;

  const showPins = useCallback((list) => {
    const m = maps.current;
    pins.current.forEach((p) => p.setMap(null)); pins.current = [];
    (list || []).slice(0, 500).forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const pin = new m.Marker({ position: { lat: p.latitude, lng: p.longitude }, map: map.current, icon: { path: m.SymbolPath.CIRCLE, scale: 4, fillColor: "#0369a1", fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 1 } });
      pins.current.push(pin);
    });
  }, []);

  const doPreview = async () => {
    setErr(""); setPhase("previewing"); setPreview(null);
    try {
      const data = await call({ action: "preview", ...geo(), filter_overrides: filterOverrides(), requested_count: Number(requested) });
      setPreview(data);
      if (data.pins) showPins(data.pins);
      setPhase("previewed");
    } catch (e) { setErr(e.message); setPhase("idle"); }
  };

  const pollStatus = useCallback(async (id) => {
    try {
      const s = await call({ action: "status", id });
      setStage(s.progress_stage || s.status || "");
      setPct(s.progress_percent || 0);
      if (s.status === "complete" || s.download_url) {
        const r = await call({ action: "rows", id });
        const list = (r.rows || r.results || r || []);
        const mapped = (Array.isArray(list) ? list : []).map((p, i) => ({
          id: "lb" + i,
          name: [p.owner_first_name || p.first_name, p.owner_last_name || p.last_name].filter(Boolean).join(" ") || p.owner_name || "(owner)",
          addr: [p.address, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
          phone: p.phone || (Array.isArray(p.phones) ? p.phones.find((x) => !x.dnc && !x.tcpa)?.number : null),
          email: p.email || (Array.isArray(p.emails) ? p.emails[0]?.email : null),
          value: p.estimated_value, equity: p.estimated_equity, beds: p.beds, sqft: p.building_size_sqft, year: p.year_built,
          lat: p.latitude, lng: p.longitude, dnc: !!p.dnc, hasPool: !!p.has_pool,
        }));
        setRows(mapped); setPhase("done");
        return;
      }
      if (s.status === "error" || s.error_message) { setErr(s.error_message || "build failed"); setPhase("previewed"); return; }
      setTimeout(() => pollStatus(id), 3000);
    } catch (e) { setErr(e.message); setPhase("previewed"); }
  }, []);

  const doExecute = async () => {
    if (!confirm(`This will build the list and charge up to ${preview?.max_credit_cost ?? "?"} credits (~$${preview?.max_credit_cost_usd ?? "?"}). Continue?`)) return;
    setErr(""); setPhase("executing"); setStage("starting"); setPct(0);
    try {
      const data = await call({ action: "execute", ...geo(), filter_overrides: filterOverrides(), requested_count: Number(requested), name: groupName || "Filter Search" });
      setJob(data); pollStatus(data.id);
    } catch (e) { setErr(e.message); setPhase("previewed"); }
  };

  const included = rows.filter((r) => !excluded[r.id]);
  const create = async () => {
    if (!included.length) return;
    setCreated("saving");
    try {
      await onCreateGroup({
        name: groupName.trim() || `Filter ${new Date().toLocaleDateString()}`, contacts: included.length, source: "Reveal",
        prospects: included.map((r) => ({ name: r.name, addr: r.addr, phone: r.phone, email: r.email, value: r.value, equity: r.equity, beds: r.beds, sqft: r.sqft, year: r.year, lat: r.lat, lng: r.lng, dnc: r.dnc, hasPool: r.hasPool })),
      });
      setCreated(true);
    } catch { setCreated(false); }
  };

  if (!key) return <div style={{ padding: 40, color: C.sub }}>Set VITE_GOOGLE_MAPS_KEY to use the map.</div>;

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 40px)", fontFamily: "system-ui" }}>
      <div style={{ flex: 1, position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", zIndex: 5, top: 14, left: 14, background: "#fff", padding: "8px 12px", borderRadius: 10, fontSize: 13, color: C.sub, boxShadow: "0 1px 4px rgba(0,0,0,.1)" }}>
          {areaMode === "radius" ? (center ? `Center set · ${radius} mi radius` : "Click the map to set a center point") : "Enter ZIP codes in the panel →"}
        </div>
        <div ref={mapEl} style={{ width: "100%", height: "100%", background: "#e9eef2" }} />
        {!ready && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.sub }}>Loading map…</div>}
      </div>

      <div style={{ width: 380, border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}` }}>
          <strong style={{ color: C.ink }}>Filter Search</strong>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>Pay only for matching homes. Preview is free.</div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Tab on={areaMode === "radius"} onClick={() => setAreaMode("radius")}>Radius</Tab>
            <Tab on={areaMode === "zips"} onClick={() => setAreaMode("zips")}>ZIP codes</Tab>
          </div>
          {areaMode === "radius" ? (
            <label style={{ fontSize: 13, color: C.sub }}>Radius: <b style={{ color: C.ink }}>{radius} mi</b>
              <input type="range" min="0.5" max="10" step="0.5" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: "100%" }} />
            </label>
          ) : (
            <input value={zips} onChange={(e) => setZips(e.target.value)} placeholder="32801, 32803, 32806" style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14 }} />
          )}

          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>FILTERS</div>
            <Check label="🏊 Has a pool" v={pool} set={setPool} />
            <Check label="Owner-occupied only" v={ownerOccupied} set={setOwnerOccupied} />
          </div>

          <label style={{ fontSize: 13, color: C.sub }}>Max homes to pull
            <input type="number" min="1" max="25000" value={requested} onChange={(e) => setRequested(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8, marginTop: 4 }} />
          </label>

          {err && <div style={{ background: "#fde8e8", color: C.red, fontSize: 12.5, padding: 10, borderRadius: 8 }}>{err}</div>}

          <button onClick={doPreview} disabled={!canSearch || phase === "previewing"} style={{ padding: 12, border: `1px solid ${C.accent}`, borderRadius: 10, background: "#fff", color: C.accent, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {phase === "previewing" ? "Checking…" : "Preview (free)"}
          </button>

          {phase === "previewed" && preview && (
            <div style={{ background: C.panel, borderRadius: 10, padding: 12, fontSize: 13.5 }}>
              <div><b style={{ color: C.ink }}>{preview.count?.toLocaleString()}</b> homes match</div>
              <div style={{ color: C.sub, marginTop: 2 }}>You'll pull up to {preview.capped_count?.toLocaleString()} · max <b style={{ color: C.ink }}>${preview.max_credit_cost_usd}</b></div>
              <button onClick={doExecute} style={{ width: "100%", marginTop: 10, padding: 11, border: "none", borderRadius: 9, background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Build list & reveal ({preview.capped_count?.toLocaleString()})
              </button>
            </div>
          )}

          {phase === "executing" && (
            <div style={{ textAlign: "center", color: C.sub, padding: 10 }}>
              <div style={{ marginBottom: 8 }}>Building… {stage}</div>
              <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: C.accent, transition: "width .3s" }} /></div>
              <div style={{ fontSize: 12, marginTop: 6 }}>{pct}% · this can take 1–5 min</div>
            </div>
          )}
        </div>

        {phase === "done" && (
          <div style={{ borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ padding: "10px 16px", fontSize: 13, color: C.sub }}>{included.length} of {rows.length} included</div>
            <div style={{ overflowY: "auto", flex: 1, padding: 12, maxHeight: 320 }}>
              {rows.map((r) => { const off = excluded[r.id]; return (
                <div key={r.id} style={{ border: `1px solid ${off ? C.line : C.accent}`, opacity: off ? 0.5 : 1, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ color: C.ink, fontSize: 14 }}>{r.name}</strong>
                    <button onClick={() => setExcluded((p) => ({ ...p, [r.id]: !p[r.id] }))} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}>{off ? "undo" : "🗑"}</button>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.sub }}>{r.addr}</div>
                  <div style={{ fontSize: 12.5, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                    {r.phone ? <span>📞 {r.phone}</span> : <span style={{ color: C.red }}>no #</span>}
                    {r.hasPool && <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "0 6px", borderRadius: 5 }}>🏊</span>}
                    {r.dnc && <span style={{ background: "#fde8e8", color: C.red, padding: "0 6px", borderRadius: 5 }}>DNC</span>}
                  </div>
                </div>); })}
            </div>
            <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 10, fontSize: 14 }} />
              <button onClick={create} disabled={!included.length || created === "saving" || created === true} style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: created === true ? C.green : C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {created === true ? "✓ Group created" : created === "saving" ? "Saving…" : `Create Group (${included.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ children, on, onClick }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "8px 0", border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 9, background: on ? C.accent : "#fff", color: on ? "#fff" : C.ink, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{children}</button>;
}
function Check({ label, v, set }) {
  return <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.ink, marginBottom: 8, cursor: "pointer" }}>
    <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /> {label}
  </label>;
}
