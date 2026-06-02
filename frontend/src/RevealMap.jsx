import React, { useEffect, useRef, useState, useCallback } from "react";

/* ============================================================================
   RevealMap — real Google Maps version of the GlassHouse "Reveal" screen.

   Draws polygons via manual click listeners (the Drawing library was deprecated
   by Google in Aug 2025 and removed May 2026, so we don't use DrawingManager).
   Uses the geometry library only for the point-in-polygon test.

   Props (same shape the app's <Reveal> uses):
     onCreateGroup({ name, contacts, prospects:[{name,addr,phone,lat,lng,...}] })
     boardLeads:  [{ id, name, addr, lat, lng, stage }]   // existing leads → pins
     focusLead:   { id, lat, lng } | null                 // pan/center here
     onOpenLead(id)                                        // click a lead pin
     clearFocus()

   Env: VITE_GOOGLE_MAPS_KEY must be set (Vercel + local .env).
============================================================================ */

const C = { accent: "#c2632a", ink: "#1d2939", sub: "#667085", line: "#e7e3dd", panel: "#faf8f5" };
const ORLANDO = { lat: 28.5384, lng: -81.3789 };

let _mapsPromise = null;
function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = "__ghMapsInit_" + Math.random().toString(36).slice(2);
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement("script");
    // geometry only — no deprecated 'drawing' library
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${cb}&v=weekly&loading=async`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

export default function RevealMap({ onCreateGroup, boardLeads = [], focusLead, onOpenLead, clearFocus }) {
  const mapEl = useRef(null);
  const map = useRef(null);
  const maps = useRef(null);
  const drawing = useRef(false);
  const points = useRef([]);            // {lat,lng} vertices being drawn
  const tempPath = useRef(null);        // polyline while drawing
  const vertexDots = useRef([]);        // markers for each clicked vertex
  const polygon = useRef(null);         // finished polygon
  const leadPins = useRef([]);          // markers for board leads

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState(null);     // 'polygon' | 'box' | null
  const [captured, setCaptured] = useState([]);
  const [excluded, setExcluded] = useState({});
  const [groupName, setGroupName] = useState("");
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  /* ---- init map ---- */
  useEffect(() => {
    if (!key) { setErr("no-key"); return; }
    let dead = false;
    loadMaps(key).then((m) => {
      if (dead) return;
      maps.current = m;
      map.current = new m.Map(mapEl.current, {
        center: ORLANDO, zoom: 13, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, clickableIcons: false,
      });
      setReady(true);
    }).catch(() => setErr("load-failed"));
    return () => { dead = true; };
  }, [key]);

  /* ---- mock homeowner lookup; swap for your prospects edge function later ---- */
  const lookupInBounds = useCallback(async (path) => {
    // path: array of {lat,lng}. We generate plausible homes inside its bbox,
    // then keep those actually inside the polygon.
    const m = maps.current;
    const poly = new m.Polygon({ paths: path });
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    path.forEach((p) => { minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); });
    const names = ["A. Carter","M. Nguyen","R. Patel","L. Reyes","J. Brooks","S. Flores","D. Cole","K. Hughes","N. Sousa","B. Russo","D. Watson","M. Beck"];
    const streets = ["Reymont St","Oak Quarry Dr","Crest Ave","Heron Bay","Maple Glen","Laureate Blvd"];
    const out = [];
    let tries = 0;
    while (out.length < 24 && tries < 400) {
      tries++;
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);
      if (!m.geometry.poly.containsLocation(new m.LatLng(lat, lng), poly)) continue;
      const value = Math.round(280 + Math.random() * 620) * 1000;
      out.push({
        id: "h" + tries,
        name: names[out.length % names.length],
        addr: `${100 + Math.floor(Math.random() * 9899)} ${streets[out.length % streets.length]}, Orlando, FL`,
        phone: `(407) ${200 + Math.floor(Math.random() * 799)}-${1000 + Math.floor(Math.random() * 8999)}`,
        value, equity: Math.round(value * (0.3 + Math.random() * 0.5)),
        beds: 2 + Math.floor(Math.random() * 4), sqft: 1200 + Math.floor(Math.random() * 2600),
        year: 1975 + Math.floor(Math.random() * 48), lat, lng, dnc: Math.random() < 0.1,
      });
    }
    poly.setMap(null);
    return out.filter((h) => !h.dnc);
  }, []);

  /* ---- finish a drawn shape ---- */
  const finishShape = useCallback(async (path) => {
    const m = maps.current;
    // draw the filled polygon
    if (polygon.current) polygon.current.setMap(null);
    polygon.current = new m.Polygon({
      paths: path, map: map.current, strokeColor: C.accent, strokeWeight: 2,
      fillColor: C.accent, fillOpacity: 0.12, clickable: false,
    });
    setBusy(true);
    const homes = await lookupInBounds(path);
    setBusy(false);
    setCaptured(homes);
    setExcluded({});
    setCreated(false);
  }, [lookupInBounds]);

  /* ---- clear everything drawn ---- */
  const clearDrawing = useCallback(() => {
    drawing.current = false;
    points.current = [];
    if (tempPath.current) { tempPath.current.setMap(null); tempPath.current = null; }
    vertexDots.current.forEach((d) => d.setMap(null)); vertexDots.current = [];
    if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }
    setCaptured([]); setExcluded({}); setGroupName(""); setCreated(false); setMode(null);
  }, []);

  /* ---- polygon drawing via map clicks ---- */
  useEffect(() => {
    if (!ready || mode !== "polygon") return;
    const m = maps.current, gmap = map.current;
    clearShapeOnly();
    drawing.current = true;
    points.current = [];

    const clickL = gmap.addListener("click", (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      points.current.push(pt);
      const dot = new m.Marker({
        position: pt, map: gmap,
        icon: { path: m.SymbolPath.CIRCLE, scale: 5, fillColor: C.accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      vertexDots.current.push(dot);
      if (tempPath.current) tempPath.current.setMap(null);
      tempPath.current = new m.Polyline({ path: points.current, map: gmap, strokeColor: C.accent, strokeWeight: 2 });
    });

    const dblL = gmap.addListener("dblclick", (e) => {
      e.stop?.();
      if (points.current.length >= 3) {
        const path = [...points.current];
        // cleanup the in-progress drawing visuals
        if (tempPath.current) { tempPath.current.setMap(null); tempPath.current = null; }
        vertexDots.current.forEach((d) => d.setMap(null)); vertexDots.current = [];
        drawing.current = false;
        setMode(null);
        finishShape(path);
      }
    });

    return () => { clickL.remove(); dblL.remove(); };

    function clearShapeOnly() {
      if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }
      if (tempPath.current) { tempPath.current.setMap(null); tempPath.current = null; }
      vertexDots.current.forEach((d) => d.setMap(null)); vertexDots.current = [];
    }
  }, [ready, mode, finishShape]);

  /* ---- box drawing: click two corners ---- */
  useEffect(() => {
    if (!ready || mode !== "box") return;
    const m = maps.current, gmap = map.current;
    let first = null, rect = null;
    if (polygon.current) { polygon.current.setMap(null); polygon.current = null; }

    const clickL = gmap.addListener("click", (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (!first) { first = pt; return; }
      const path = [
        { lat: first.lat, lng: first.lng },
        { lat: first.lat, lng: pt.lng },
        { lat: pt.lat, lng: pt.lng },
        { lat: pt.lat, lng: first.lng },
      ];
      setMode(null);
      finishShape(path);
    });
    const moveL = gmap.addListener("mousemove", (e) => {
      if (!first) return;
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const path = [
        { lat: first.lat, lng: first.lng }, { lat: first.lat, lng: pt.lng },
        { lat: pt.lat, lng: pt.lng }, { lat: pt.lat, lng: first.lng },
      ];
      if (rect) rect.setMap(null);
      rect = new m.Polygon({ paths: path, map: gmap, strokeColor: C.accent, strokeWeight: 2, fillColor: C.accent, fillOpacity: 0.1, clickable: false });
    });
    return () => { clickL.remove(); moveL.remove(); if (rect) rect.setMap(null); };
  }, [ready, mode, finishShape]);

  /* ---- render board leads as pins ---- */
  useEffect(() => {
    if (!ready) return;
    const m = maps.current;
    leadPins.current.forEach((p) => p.setMap(null)); leadPins.current = [];
    const color = { jackie: "#7c3aed", needsAttention: C.accent, booked: "#0a8a4a" };
    boardLeads.forEach((l) => {
      if (l.lat == null || l.lng == null) return;
      const pin = new m.Marker({
        position: { lat: l.lat, lng: l.lng }, map: map.current, title: l.name,
        icon: { path: m.SymbolPath.CIRCLE, scale: 7, fillColor: color[l.stage] || C.accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      pin.addListener("click", () => onOpenLead && onOpenLead(l.id));
      leadPins.current.push(pin);
    });
  }, [ready, boardLeads, onOpenLead]);

  /* ---- focus / pan to a lead ---- */
  useEffect(() => {
    if (!ready || !focusLead || focusLead.lat == null) return;
    map.current.panTo({ lat: focusLead.lat, lng: focusLead.lng });
    map.current.setZoom(16);
  }, [ready, focusLead]);

  const included = captured.filter((h) => !excluded[h.id]);

  const create = async () => {
    if (!included.length) return;
    setBusy(true);
    try {
      await onCreateGroup({
        name: groupName.trim() || `Reveal Group ${new Date().toLocaleDateString()}`,
        contacts: included.length,
        source: "Reveal",
        prospects: included.map((h) => ({
          name: h.name, addr: h.addr, phone: h.phone, email: null,
          value: h.value, equity: h.equity, beds: h.beds, sqft: h.sqft, year: h.year,
          lat: h.lat, lng: h.lng,
        })),
      });
      setCreated(true);
    } finally { setBusy(false); }
  };

  /* ---- missing key fallback ---- */
  if (err === "no-key") {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: C.sub }}>
        <h3 style={{ color: C.ink }}>Google Maps key not set</h3>
        <p>Add <code>VITE_GOOGLE_MAPS_KEY</code> in Vercel (and your local <code>.env</code>), then redeploy.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 40px)", fontFamily: "system-ui" }}>
      {/* map + toolbar */}
      <div style={{ flex: 1, position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", zIndex: 5, top: 14, left: 14, display: "flex", gap: 8 }}>
          <Btn on={mode === "polygon"} onClick={() => setMode("polygon")}>✎ Draw polygon</Btn>
          <Btn on={mode === "box"} onClick={() => setMode("box")}>▭ Draw box</Btn>
          <Btn onClick={clearDrawing}>↺ Clear</Btn>
          {mode && <span style={{ alignSelf: "center", background: "#1d2939", color: "#fff", fontSize: 12.5, padding: "6px 10px", borderRadius: 8 }}>
            {mode === "polygon" ? "Click points · double-click to close" : "Click two corners"}
          </span>}
        </div>
        <div ref={mapEl} style={{ width: "100%", height: "100%", background: "#e9eef2" }} />
        {!ready && !err && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.sub }}>Loading map…</div>}
        {err === "load-failed" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#b42318" }}>Map failed to load — check the key & allowed referrers.</div>}
      </div>

      {/* review panel */}
      <div style={{ width: 360, border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ color: C.ink }}>Prospect Group</strong>
          <span style={{ color: C.accent, fontWeight: 700 }}>{included.length}</span>
        </div>
        {busy && <div style={{ padding: 18, color: C.sub }}>Revealing homeowners…</div>}
        {!busy && captured.length === 0 && (
          <div style={{ padding: 30, color: C.sub, textAlign: "center", margin: "auto" }}>
            Pick <b>Draw polygon</b> or <b>Draw box</b>, then outline an area to reveal the homeowners inside.
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1, padding: captured.length ? 12 : 0 }}>
          {captured.map((h) => {
            const off = excluded[h.id];
            return (
              <div key={h.id} style={{ border: `1px solid ${off ? C.line : C.accent}`, opacity: off ? 0.5 : 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: C.ink }}>{h.name}</strong>
                  <button onClick={() => setExcluded((p) => ({ ...p, [h.id]: !p[h.id] }))}
                    style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}>{off ? "undo" : "🗑"}</button>
                </div>
                <div style={{ fontSize: 13, color: C.sub, margin: "4px 0" }}>{h.addr}</div>
                <div style={{ fontSize: 13, display: "flex", gap: 12 }}>
                  <span>📞 {h.phone}</span><span>$ ${Math.round(h.value / 1000)}k</span>
                </div>
              </div>
            );
          })}
        </div>
        {captured.length > 0 && (
          <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Laureate Q2)"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 10, fontSize: 14 }} />
            <button onClick={create} disabled={!included.length || busy || created}
              style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: created ? "#0a8a4a" : C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {created ? "✓ Group created" : busy ? "Saving…" : `Create Group (${included.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ children, on, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 13px", border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10,
      background: on ? C.accent : "#fff", color: on ? "#fff" : C.ink, fontWeight: 600, fontSize: 13.5, cursor: "pointer",
    }}>{children}</button>
  );
}
