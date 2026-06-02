import React, { useState, useMemo } from "react";
import { useGlassHouse } from "./hooks/useGlassHouse";
import RevealMap from "./RevealMap";

const HAS_MAPS_KEY = !!import.meta.env.VITE_GOOGLE_MAPS_KEY;
import {
  Map, RefreshCw, Send, Columns, Megaphone, Inbox, Settings as Cog,
  MessageSquare, HelpCircle, Database, Search, Plus, ChevronLeft,
  Users, MapPin, Phone, Sparkles, X, Filter, Pencil, Building2,
  Crosshair, ChevronDown, Upload, Bookmark, Mail, Clock, Check,
  Square, Home, DollarSign, Bed, Ruler, CalendarDays, Trash2, RotateCcw,
  TrendingUp, CalendarCheck, Reply, Send as SendIcon, CornerDownLeft,
} from "lucide-react";

/* ----------------------------------------------------------------
   GlassHouse — rebuilt. Single-file clickable prototype.
   Palette: deep slate ink + warm amber accent (distinct from the
   stock blue/orange original), Fraunces display + system body.
-----------------------------------------------------------------*/

const C = {
  ink: "#16202e",
  panel: "#f5f6f8",
  line: "#e4e7ec",
  accent: "#c2632a",       // burnt amber
  accentSoft: "#fbeee4",
  blue: "#2f6df0",
  green: "#1f9d57",
  greenSoft: "#e6f6ec",
  sub: "#667085",
};

const font = `'Fraunces', Georgia, serif`;
const body = `ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif`;

const NAV = [
  { id: "reveal", label: "Reveal", icon: Map },
  { id: "reengage", label: "ReEngage", icon: RefreshCw },
  { id: "outreach", label: "Outreach", icon: Send },
  { id: "salesboard", label: "Sales Board", icon: Columns },
];
const NAV2 = [
  { id: "campaigns", label: "Campaign Templates", icon: Megaphone },
  { id: "templates", label: "Message Templates", icon: Inbox },
  { id: "automations", label: "Automations", icon: Cog },
];

const HOT_LEADS = [
  { name: "Winston Moonilal", area: "Laurete 2", addr: "9262 Reymont St, Orlando, FL 32827", phone: "(718) 650-1119", msg: "Sent from my iPhone to yours.", days: 25 },
  { name: "Islam Sidky", area: "Nona Crest", addr: "9942 Oak Quarry Dr, Orlando, FL 32832", phone: "(248) 897-1947", msg: "Okay, thanks", days: 29 },
  { name: "Juan A Rodriguez", area: "East Lake Nona", addr: "9007 Flat Rock Ln, Orlando, FL 32832", phone: "(787) 410-2699", msg: "Happy Monday. Checking if you received and if you have any questions.", days: 30 },
  { name: "Alyssa Stor", area: "Randal Park", addr: "10533 Billings St, Orlando, FL 32832", phone: "(646) 334-1331", msg: "If Sofits and Fachia are in good shape, I can add it as an option.", days: 31 },
];

const TEMPLATES = [
  "HOA with prospect street", "Regal Crest", "The Enclave", "Village Walk neighborhood",
  "Winterpark neighborhood", "Street Only - no link", "HOA Letters - no link", "NO LINK route density",
];

function Pill({ children, tone = "green" }) {
  const map = { green: [C.green, C.greenSoft], amber: [C.accent, C.accentSoft] };
  const [fg, bg] = map[tone];
  return (
    <span style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>
      {children}
    </span>
  );
}

function Sidebar({ active, setActive, settingsActive, setSettingsActive, outreachCount = 0 }) {
  const item = (n, isActive, onClick) => {
    const Icon = n.icon;
    const badge = n.id === "outreach" && outreachCount > 0;
    return (
      <button key={n.id} onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
          background: isActive ? C.accentSoft : "transparent",
          color: isActive ? C.accent : C.ink,
          fontWeight: isActive ? 700 : 500, fontSize: 15, textAlign: "left",
          transition: "background .15s",
        }}>
        <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
        {n.label}
        {badge && <span style={{ marginLeft: "auto", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 6px" }}>{outreachCount}</span>}
      </button>
    );
  };
  return (
    <aside style={{ width: 268, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: "#fff", display: "flex", flexDirection: "column", padding: "20px 16px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 18px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: C.ink, display: "grid", placeItems: "center" }}>
          <div style={{ width: 13, height: 13, border: "2.2px solid #fff", borderBottom: "none", borderRadius: "3px 3px 0 0" }} />
        </div>
        <span style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: C.ink, letterSpacing: -0.5 }}>GlassHouse</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((n) => item(n, active === n.id && !settingsActive, () => { setActive(n.id); setSettingsActive(false); }))}
      </div>

      <div style={{ margin: "18px 6px", padding: 16, background: C.panel, borderRadius: 14 }}>
        <div style={{ fontFamily: font, fontSize: 30, fontWeight: 600, color: C.ink, lineHeight: 1 }}>3,512</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, color: C.sub, fontSize: 14, fontWeight: 600 }}>
          <Database size={15} /> Credit Balance
        </div>
        <a style={{ color: C.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-block", marginTop: 6 }}>Show Details</a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
        {NAV2.map((n) => item(n, active === n.id && !settingsActive, () => { setActive(n.id); setSettingsActive(false); }))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "flex", gap: 18, padding: "16px 8px 0", color: C.sub }}>
        <button onClick={() => setSettingsActive(true)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", color: settingsActive ? C.accent : C.sub, fontWeight: settingsActive ? 700 : 500, fontSize: 14 }}>
          <Cog size={17} /> Settings
        </button>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}><MessageSquare size={17} /> Chat</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}><HelpCircle size={17} /> Help</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 8px 0" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>MB</div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Michael Baitelli</div>
          <div style={{ fontSize: 12, color: C.sub }}>Wow 1 Day Painting</div>
        </div>
      </div>
    </aside>
  );
}

function Header({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
      <div>
        <h1 style={{ fontFamily: font, fontSize: 30, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: -0.5 }}>{title}</h1>
        {sub && <p style={{ color: C.sub, margin: "6px 0 0", fontSize: 15 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, primary, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px",
      borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer",
      border: primary ? "none" : `1px solid ${C.line}`,
      background: primary ? C.accent : "#fff", color: primary ? "#fff" : C.ink,
    }}>
      {Icon && <Icon size={17} />} {children}
    </button>
  );
}

/* ---------------- REVEAL (interactive draw + capture + review) ---------------- */
const VB = 800;              // svg viewBox width / coordinate space
const VBH = 600;

// Seeded houses scattered across the map (stable across renders)
const HOUSES = (() => {
  const first = ["James", "Maria", "David", "Linda", "Robert", "Patricia", "John", "Jennifer", "Carlos", "Susan", "Miguel", "Karen", "Daniel", "Nancy", "Kevin", "Laura", "Brian", "Emily", "Jason", "Olivia", "Andre", "Rosa", "Tyler", "Grace", "Hassan", "Mei", "Diego", "Priya", "Sean", "Ana"];
  const last = ["Carter", "Nguyen", "Patel", "Reyes", "Brooks", "Watson", "Flores", "Cole", "Bennett", "Hughes", "Sousa", "Kim", "Ortiz", "Webb", "Foster", "Pena", "Russo", "Tran", "Lima", "Beck"];
  const streets = ["Reymont St", "Oak Quarry Dr", "Flat Rock Ln", "Billings St", "Laureate Blvd", "Crest Ave", "Village Walk", "Enclave Dr", "Heron Bay", "Maple Glen"];
  const arr = [];
  let s = 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 46; i++) {
    const val = Math.round((280 + rnd() * 620) / 5) * 5 * 1000; // 280k–900k
    const equityPct = 0.25 + rnd() * 0.55;
    arr.push({
      id: i,
      x: 60 + rnd() * (VB - 120),
      y: 70 + rnd() * (VBH - 130),
      name: `${first[Math.floor(rnd() * first.length)]} ${last[Math.floor(rnd() * last.length)]}`,
      addr: `${100 + Math.floor(rnd() * 9899)} ${streets[Math.floor(rnd() * streets.length)]}, Orlando, FL 328${10 + Math.floor(rnd() * 80)}`,
      phone: `(407) ${200 + Math.floor(rnd() * 799)}-${1000 + Math.floor(rnd() * 8999)}`,
      value: val,
      equity: Math.round(val * equityPct / 1000) * 1000,
      beds: 2 + Math.floor(rnd() * 4),
      sqft: 1200 + Math.floor(rnd() * 2600),
      year: 1975 + Math.floor(rnd() * 48),
    });
  }
  return arr;
})();

const DEFAULT_LEADS = {
  jackie: [],
  needsAttention: HOT_LEADS.map((l, i) => ({
    ...l, id: "seed" + i, stage: "needsAttention",
    x: HOUSES[i * 6 + 3].x, y: HOUSES[i * 6 + 3].y,
    thread: [
      { from: "us", text: "Hi " + l.name.split(" ")[0] + ", we're painting in your area — want a free quote?", time: "Mon 9:02 AM" },
      { from: "lead", text: l.msg, time: "Mon 9:14 AM", read: true },
    ],
  })),
  booked: [],
};

const usd = (n) => "$" + (n >= 1000 ? (n / 1000).toFixed(0) + "k" : n);

// point-in-polygon (ray casting)
function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function Reveal({ onCreateGroup, goOutreach, boardLeads = [], focusLead, onOpenLead, clearFocus }) {
  const [mode, setMode] = useState(null);          // 'poly' | 'box' | null
  const [poly, setPoly] = useState([]);            // committed polygon points (closed)
  const [draft, setDraft] = useState([]);          // in-progress polygon clicks
  const [box, setBox] = useState(null);            // {x0,y0,x1,y1}
  const [dragStart, setDragStart] = useState(null);
  const [captured, setCaptured] = useState(null);  // array of house ids, or null
  const [excluded, setExcluded] = useState({});    // id -> true
  const [openId, setOpenId] = useState(null);
  const [created, setCreated] = useState(false);
  const [groupName, setGroupName] = useState("");
  const svgRef = React.useRef(null);

  // convert mouse event -> viewBox coords
  const toVB = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VB, y: ((e.clientY - r.top) / r.height) * VBH };
  };

  const reset = () => { setPoly([]); setDraft([]); setBox(null); setCaptured(null); setExcluded({}); setOpenId(null); setCreated(false); setGroupName(""); };

  const capture = (shape, type) => {
    const ids = HOUSES.filter((h) => {
      if (type === "box") {
        const { x0, y0, x1, y1 } = shape;
        return h.x >= Math.min(x0, x1) && h.x <= Math.max(x0, x1) && h.y >= Math.min(y0, y1) && h.y <= Math.max(y0, y1);
      }
      return inPoly(h, shape);
    }).map((h) => h.id);
    setCaptured(ids);
    setMode(null);
  };

  const onClick = (e) => {
    if (mode !== "poly") return;
    setDraft((d) => [...d, toVB(e)]);
  };
  const onDblClick = () => {
    if (mode === "poly" && draft.length >= 3) { setPoly(draft); capture(draft, "poly"); setDraft([]); }
  };
  const onDown = (e) => { if (mode === "box") { const p = toVB(e); setDragStart(p); setBox({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }); } };
  const onMove = (e) => { if (mode === "box" && dragStart) { const p = toVB(e); setBox({ ...box, x1: p.x, y1: p.y }); } };
  const onUp = () => { if (mode === "box" && box) { capture(box, "box"); setDragStart(null); } };

  const reviewHouses = captured ? HOUSES.filter((h) => captured.includes(h.id)) : [];
  const includedCount = reviewHouses.filter((h) => !excluded[h.id]).length;
  const cursor = mode === "poly" ? "crosshair" : mode === "box" ? "crosshair" : "grab";

  return (
    <div style={{ position: "relative", height: "100%", borderRadius: 16, overflow: "hidden", background: C.ink }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${VB} ${VBH}`} preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, cursor }}
        onClick={onClick} onDoubleClick={onDblClick} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
        <rect width={VB} height={VBH} fill="#1b2735" />
        {Array.from({ length: 18 }).map((_, i) => <line key={"v" + i} x1={i * 48} y1="0" x2={i * 48} y2={VBH} stroke="#243244" strokeWidth="1" />)}
        {Array.from({ length: 14 }).map((_, i) => <line key={"h" + i} x1="0" y1={i * 48} x2={VB} y2={i * 48} stroke="#243244" strokeWidth="1" />)}
        <text x="400" y="60" fill="#33445a" fontSize="34" fontWeight="700" textAnchor="middle" fontFamily={font}>Orlando</text>

        {/* committed box / polygon */}
        {box && <rect x={Math.min(box.x0, box.x1)} y={Math.min(box.y0, box.y1)} width={Math.abs(box.x1 - box.x0)} height={Math.abs(box.y1 - box.y0)} fill={C.accent} fillOpacity="0.14" stroke={C.accent} strokeWidth="2" strokeDasharray="6 4" />}
        {poly.length > 0 && <polygon points={poly.map((p) => `${p.x},${p.y}`).join(" ")} fill={C.accent} fillOpacity="0.14" stroke={C.accent} strokeWidth="2" />}
        {/* in-progress polygon */}
        {draft.length > 0 && <polyline points={draft.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={C.accent} strokeWidth="2" strokeDasharray="5 4" />}
        {draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={C.accent} />)}

        {/* houses */}
        {HOUSES.map((h) => {
          const isCap = captured && captured.includes(h.id);
          const isOut = excluded[h.id];
          return (
            <g key={h.id} onClick={(e) => { if (isCap) { e.stopPropagation(); setOpenId(h.id); } }} style={{ cursor: isCap ? "pointer" : "inherit" }}>
              <circle cx={h.x} cy={h.y} r={isCap ? 6 : 3.5}
                fill={isCap ? (isOut ? "#5b6b7e" : C.accent) : "#3a4d63"}
                stroke={isCap ? "#fff" : "none"} strokeWidth="1.5" />
            </g>
          );
        })}

        {/* board leads as pins */}
        {boardLeads.filter((l) => l.x != null).map((l) => {
          const focused = focusLead && focusLead.id === l.id;
          const color = l.stage === "booked" ? C.green : l.stage === "jackie" ? C.blue : C.accent;
          return (
            <g key={"lead" + l.id} transform={`translate(${l.x},${l.y})`} style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); onOpenLead && onOpenLead(l.id); }}>
              {focused && <circle r="22" fill={color} opacity="0.25"><animate attributeName="r" values="14;26;14" dur="1.6s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.6s" repeatCount="indefinite" /></circle>}
              {/* teardrop pin */}
              <path d="M0,-18 C7,-18 11,-13 11,-7 C11,0 0,8 0,8 C0,8 -11,0 -11,-7 C-11,-13 -7,-18 0,-18 Z" fill={color} stroke="#fff" strokeWidth="2" />
              <circle cx="0" cy="-8" r="4" fill="#fff" />
            </g>
          );
        })}
      </svg>

      {/* focused lead callout */}
      {focusLead && focusLead.x != null && (
        <div style={{ position: "absolute", left: 16, bottom: 16, background: "#fff", borderRadius: 14, padding: 16, width: 280, boxShadow: "0 8px 28px rgba(0,0,0,.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={16} color={C.accent} />
            <span style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>{focusLead.name}</span>
            <button onClick={clearFocus} style={{ marginLeft: "auto", border: "none", background: C.panel, borderRadius: 7, padding: 5, cursor: "pointer" }}><X size={14} /></button>
          </div>
          <div style={{ color: C.sub, fontSize: 13, margin: "8px 0 12px" }}>{focusLead.addr}</div>
          <button onClick={() => onOpenLead && onOpenLead(focusLead.id)} style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "9px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <MessageSquare size={15} /> Open conversation
          </button>
        </div>
      )}

      {/* toolbar */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 360, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => { reset(); setMode("poly"); }} style={tbtn(mode === "poly")}><Pencil size={16} /> Draw polygon</button>
        <button onClick={() => { reset(); setMode("box"); }} style={tbtn(mode === "box")}><Square size={16} /> Draw box</button>
        <button style={tbtn(false)}><Building2 size={16} /> Select Neighborhood</button>
        {(captured || draft.length > 0 || box) && (
          <button onClick={reset} style={{ ...tbtn(false), color: C.accent }}><RotateCcw size={16} /> Clear</button>
        )}
        {mode === "poly" && <span style={{ background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 13, padding: "8px 12px", borderRadius: 8 }}>Click points · double-click to close</span>}
        {mode === "box" && <span style={{ background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 13, padding: "8px 12px", borderRadius: 8 }}>Click & drag a box</span>}
      </div>

      {/* review panel */}
      <div style={{ position: "absolute", top: 16, right: 16, bottom: 16, width: 332, background: "#fff", borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={18} /> <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Prospect Group</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: captured ? C.accent : C.sub }}>{captured ? includedCount : 0}</span>
        </div>

        {created ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", padding: 24, color: C.ink }}>
            <div>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenSoft, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Check size={26} color={C.green} /></div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Group created</div>
              <div style={{ color: C.sub, fontSize: 14, margin: "6px 0 18px" }}>{includedCount} prospects ready for Outreach.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <Btn primary onClick={goOutreach} icon={Send}>View in Outreach</Btn>
                <Btn onClick={reset} icon={RotateCcw}>Draw another</Btn>
              </div>
            </div>
          </div>
        ) : !captured ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", padding: 24, color: C.sub }}>
            <div>
              <Pencil size={30} strokeWidth={1.5} style={{ opacity: 0.5 }} />
              <div style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.5 }}>Pick <b>Draw polygon</b> or <b>Draw box</b>,<br />then outline an area on the map to<br />reveal the homeowners inside.</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "12px 18px", fontSize: 13, color: C.sub, borderBottom: `1px solid ${C.line}`, background: C.panel }}>
              Captured <b style={{ color: C.ink }}>{reviewHouses.length}</b> homes · reviewing {includedCount} included. Tap a card to expand.
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {reviewHouses.map((h) => {
                const out = excluded[h.id];
                const open = openId === h.id;
                return (
                  <div key={h.id} style={{ border: `1px solid ${out ? C.line : C.accent}`, borderRadius: 12, padding: 12, marginBottom: 10, background: out ? "#fafbfc" : "#fff", opacity: out ? 0.7 : 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setOpenId(open ? null : h.id)}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{h.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", color: C.sub, fontSize: 12.5, marginTop: 3 }}><MapPin size={12} /> {h.addr}</div>
                      </div>
                      <button onClick={() => setExcluded((x) => ({ ...x, [h.id]: !x[h.id] }))}
                        title={out ? "Include" : "Exclude"}
                        style={{ border: "none", background: out ? C.greenSoft : C.accentSoft, borderRadius: 7, padding: 6, cursor: "pointer", color: out ? C.green : C.accent }}>
                        {out ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                      <Tag icon={Phone}>{h.phone}</Tag>
                      <Tag icon={DollarSign}>{usd(h.value)}</Tag>
                    </div>
                    {open && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5, color: C.ink }}>
                        <Detail icon={DollarSign} k="Est. equity" v={usd(h.equity)} />
                        <Detail icon={Bed} k="Beds" v={h.beds} />
                        <Detail icon={Ruler} k="Sq ft" v={h.sqft.toLocaleString()} />
                        <Detail icon={CalendarDays} k="Year built" v={h.year} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Laureate Q2)"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
              <button disabled={includedCount === 0} onClick={() => {
                  const includedProspects = reviewHouses
                    .filter((h) => !excluded[h.id])
                    .map((h) => ({
                      name: h.name, addr: h.addr, phone: h.phone, email: h.email ?? null,
                      value: h.value, equity: h.equity, beds: h.beds, sqft: h.sqft, year: h.year,
                      // prototype map uses SVG x/y; map them to rough lat/lng around Orlando
                      lat: 28.54 + (200 - h.y) / 4000,
                      lng: -81.38 + (h.x - 400) / 4000,
                    }));
                  onCreateGroup && onCreateGroup({
                    name: groupName.trim() || `Reveal Group ${new Date().toLocaleDateString()}`,
                    contacts: includedCount,
                    date: new Date().toLocaleDateString("en-US"),
                    source: "Reveal",
                    prospects: includedProspects,
                  });
                  setCreated(true);
                }}
                style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", fontSize: 15, fontWeight: 700, cursor: includedCount ? "pointer" : "not-allowed", background: includedCount ? C.accent : C.line, color: includedCount ? "#fff" : C.sub, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Users size={17} /> Create Group ({includedCount})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const tbtn = (active) => ({
  display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10,
  border: "none", background: active ? C.accent : "#fff", color: active ? "#fff" : C.ink,
  fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)",
});
function Tag({ icon: I, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.panel, color: C.ink, fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}><I size={12} /> {children}</span>;
}
function Detail({ icon: I, k, v }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6 }}><I size={13} color={C.sub} /><span style={{ color: C.sub }}>{k}:</span> <b>{v}</b></div>;
}

/* ---------------- REENGAGE ---------------- */
function ReEngage() {
  const tabs = ["All Contacts", "Recent Jobs (<6 Months)", "High Value Homes (>$600k)"];
  const [tab, setTab] = useState(0);
  return (
    <>
      <Header title="ReEngage" sub="Send segments of past clients and quoted leads to the Sales Board for resell, cross-sell, and upsell offers."
        action={<div style={{ display: "flex", gap: 10 }}><Btn icon={Upload}>Import…</Btn><Btn primary icon={Plus}>Add Contact</Btn></div>} />
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ border: "none", background: "none", padding: "10px 14px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: tab === i ? C.accent : C.sub, borderBottom: tab === i ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1 }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {["ZIP", "Home Value", "Last Emailed", "Last Texted", "Last Job"].map((f) => (
          <button key={f} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.ink }}>{f} <ChevronDown size={15} /></button>
        ))}
        <button style={{ color: C.blue, fontWeight: 700, border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>+ More Filters</button>
      </div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1fr 1fr 1.4fr", padding: "14px 18px", background: C.panel, fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}` }}>
          <span /><span>Name</span><span>Emails</span><span>Phones</span><span>Street Address</span>
        </div>
        <div style={{ padding: "70px 0", textAlign: "center", color: C.sub }}>
          <Inbox size={42} strokeWidth={1.4} style={{ opacity: 0.5 }} />
          <div style={{ margin: "14px 0 18px", fontSize: 16 }}>No contacts yet</div>
          <Btn primary icon={Upload}>Import a CSV</Btn>
        </div>
      </div>
    </>
  );
}

/* ---------------- OUTREACH ---------------- */
function Outreach({ groups = [], onSend, sentGroupNames = [] }) {
  const tabs = ["All", "Reveal", "ReEngage", "Prospect Import"];
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(null); // group obj
  const filtered = groups.filter((g) =>
    (tab === 0 || g.source === tabs[tab]) &&
    g.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <Header title="Outreach" sub="Send new messages and campaigns"
        action={<Btn primary icon={Plus}>Create New Prospect Group</Btn>} />
      <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: C.ink }}>Your Prospect Groups</h2>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", marginTop: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", gap: 6 }}>
            {tabs.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{ border: "none", background: tab === i ? C.accentSoft : "none", color: tab === i ? C.accent : C.sub, padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel, borderRadius: 9, padding: "8px 12px" }}>
            <Search size={15} color={C.sub} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prospect groups…" style={{ border: "none", background: "none", outline: "none", fontSize: 14 }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 0.8fr 1fr", padding: "14px 18px", fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}` }}>
          <span>Prospect Group Name</span><span>Contacts</span><span>Date Created</span><span>Status</span><span>Source</span><span style={{ textAlign: "right" }}>Action</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.sub, fontSize: 16 }}>
            {groups.length === 0 ? "No prospect groups yet — draw an area in Reveal to create one." : "No groups match this filter."}
          </div>
        ) : filtered.map((g, i) => {
          const sent = sentGroupNames.includes(g.name);
          return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 0.8fr 1fr", padding: "16px 18px", alignItems: "center", borderBottom: `1px solid ${C.line}`, fontSize: 14.5 }}>
            <span style={{ fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: C.accentSoft, display: "grid", placeItems: "center" }}><Map size={15} color={C.accent} /></span>
              {g.name}
            </span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{g.contacts}</span>
            <span style={{ color: C.sub }}>{g.date}</span>
            <span><Pill tone={sent ? "green" : "amber"}>{sent ? "Sent" : "Ready to send"}</Pill></span>
            <span style={{ color: C.sub }}>{g.source}</span>
            <span style={{ textAlign: "right" }}>
              <button onClick={() => setComposing(g)} style={{ background: sent ? "#fff" : C.accent, color: sent ? C.accent : "#fff", border: sent ? `1px solid ${C.accent}` : "none", borderRadius: 8, padding: "8px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Send size={14} /> {sent ? "Send again" : "Compose"}
              </button>
            </span>
          </div>
          );
        })}
      </div>
      {composing && <Composer group={composing} onClose={() => setComposing(null)} onSend={(payload) => { onSend(payload); setComposing(null); }} />}
    </>
  );
}

/* ---------------- COMPOSER (campaign modal) ---------------- */
function Composer({ group, onClose, onSend }) {
  const [channel, setChannel] = useState("sms");
  const [tpl, setTpl] = useState(TEMPLATES[0]);
  const sampleBody = {
    "HOA with prospect street": "Hi {{first_name}}, we're doing exterior painting on {{street}} this month and have a neighbor special. Want a free quote?",
    "Regal Crest": "Hello {{first_name}}! We're working in Regal Crest soon — would you like a complimentary painting estimate while we're in your area?",
  };
  const [msgBody, setMsgBody] = useState(sampleBody[TEMPLATES[0]] || "Hi {{first_name}}, we're offering a neighborhood special this month. Reply YES for a free quote!");
  const [subject, setSubject] = useState("A neighborhood painting offer for you");

  const pickTpl = (t) => { setTpl(t); setMsgBody(sampleBody[t] || `Hi {{first_name}}, ${t} — reply YES for a free quote!`); };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,32,.5)", display: "grid", placeItems: "center", zIndex: 60, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(640px,100%)", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.line}` }}>
          <div>
            <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 600, margin: 0, color: C.ink }}>New Campaign</h3>
            <div style={{ color: C.sub, fontSize: 14, marginTop: 4 }}>{group.name} · {group.contacts} contacts</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: C.panel, borderRadius: 9, padding: 9, cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={lbl}>Channel</label>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[["sms", "SMS", MessageSquare], ["email", "Email", Mail]].map(([id, t, I]) => (
                <button key={id} onClick={() => setChannel(id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14.5, border: `1.5px solid ${channel === id ? C.accent : C.line}`, background: channel === id ? C.accentSoft : "#fff", color: channel === id ? C.accent : C.ink }}>
                  <I size={17} /> {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Template</label>
            <select value={tpl} onChange={(e) => pickTpl(e.target.value)} style={{ width: "100%", marginTop: 8, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, background: "#fff", cursor: "pointer" }}>
              {TEMPLATES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {channel === "email" && (
            <div>
              <label style={lbl}>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", marginTop: 8, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, boxSizing: "border-box" }} />
            </div>
          )}
          <div>
            <label style={lbl}>Message</label>
            <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} style={{ width: "100%", minHeight: 120, marginTop: 8, padding: 14, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, fontFamily: body, resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }} />
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>Merge tags: {"{{first_name}}"}, {"{{street}}"} · {channel === "sms" ? `${msgBody.length} chars` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: `1px solid ${C.line}`, justifyContent: "flex-end" }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <button onClick={() => onSend({ group: group.name, contacts: group.contacts, channel, template: tpl, body: msgBody, subject })}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Send size={16} /> Send to {group.contacts}
          </button>
        </div>
      </div>
    </div>
  );
}
const lbl = { fontSize: 13, fontWeight: 700, color: C.ink };

/* ---------------- SALES BOARD (kanban + stats + DnD) ---------------- */
const STAGES = [
  { key: "jackie", title: "Hot Leads – Jackie Answering", accent: C.blue },
  { key: "needsAttention", title: "Hot Leads – Needs Attention", accent: C.accent },
  { key: "booked", title: "Booked", accent: C.green },
];

function StatCard({ icon: I, label, value, tone }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: tone[1], display: "grid", placeItems: "center" }}><I size={20} color={tone[0]} /></div>
      <div>
        <div style={{ fontFamily: font, fontSize: 26, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function SalesBoard({ campaigns = [], leads, goOutreach, onMove, onOpen, onViewMap, onReset }) {
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const allLeads = [...leads.jackie, ...leads.needsAttention, ...leads.booked];
  const sent = campaigns.reduce((a, c) => a + (c.contacts || 0), 0);
  const replied = allLeads.filter((l) => l._reply !== false).length; // every lead card represents a reply
  const booked = leads.booked.length;
  const rate = sent ? Math.round((replied / sent) * 100) : 0;

  const onDrop = (colKey) => {
    if (dragId) onMove(dragId, colKey);
    setDragId(null); setOverCol(null);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Send} label="Messages sent" value={sent} tone={[C.blue, "#eaf1ff"]} />
        <StatCard icon={MessageSquare} label="Replies received" value={replied} tone={[C.accent, C.accentSoft]} />
        <StatCard icon={CalendarCheck} label="Booked" value={booked} tone={[C.green, C.greenSoft]} />
        <StatCard icon={TrendingUp} label="Reply rate" value={rate + "%"} tone={[C.ink, C.panel]} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
        <div style={{ flex: 1, maxWidth: 360, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
          <Search size={16} color={C.sub} /><input placeholder="Search name or phone" style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }} />
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", fontWeight: 600, cursor: "pointer" }}>All Time <ChevronDown size={15} /></button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12.5, color: C.green, display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} /> Live</span>
          <button onClick={onReset} title="Refresh from server" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", color: C.sub, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}><RotateCcw size={14} /> Refresh</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, height: "calc(100% - 190px)" }}>
        {/* campaigns column (not a drop target) */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: `2.5px solid ${C.sub}`, marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>Active Campaigns</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: C.sub }}>{campaigns.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 4 }}>
            <button onClick={goOutreach} style={{ border: `1.5px dashed ${C.blue}`, borderRadius: 12, padding: 16, background: "#f5f8ff", cursor: "pointer", textAlign: "left", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue, fontWeight: 700, fontSize: 14.5 }}><Plus size={17} /> Launch New Campaign</div>
            </button>
            {campaigns.map((c, i) => (
              <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: c.channel === "sms" ? "#eaf1ff" : C.greenSoft, display: "grid", placeItems: "center" }}>
                    {c.channel === "sms" ? <MessageSquare size={13} color={C.blue} /> : <Mail size={13} color={C.green} />}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{c.group}</span>
                </div>
                <div style={{ background: C.panel, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: C.ink, lineHeight: 1.4, margin: "9px 0" }}>{c.body}</div>
                <div style={{ fontSize: 12, color: C.sub }}><Check size={12} color={C.green} style={{ verticalAlign: -2 }} /> Sent to {c.contacts} · {c.sentAt}</div>
              </div>
            ))}
          </div>
        </div>

        {/* lead stages (drop targets) */}
        {STAGES.map((st) => (
          <div key={st.key} style={{ flex: 1, minWidth: 270, display: "flex", flexDirection: "column" }}
            onDragOver={(e) => { e.preventDefault(); setOverCol(st.key); }}
            onDragLeave={() => setOverCol((c) => c === st.key ? null : c)}
            onDrop={() => onDrop(st.key)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: `2.5px solid ${st.accent}`, marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>{st.title}</span>
              {st.key === "jackie" && <Sparkles size={14} color={C.blue} />}
              <span style={{ marginLeft: "auto", fontWeight: 700, color: C.sub }}>{leads[st.key].length}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 4, borderRadius: 12, background: overCol === st.key ? "rgba(194,99,42,.06)" : "transparent", outline: overCol === st.key ? `2px dashed ${st.accent}` : "none", transition: "background .15s" }}>
              {leads[st.key].length === 0
                ? <div style={{ textAlign: "center", color: C.sub, padding: "36px 12px", fontSize: 13.5 }}>{st.key === "booked" ? "Drag won leads here" : "No leads yet"}</div>
                : leads[st.key].map((c) => (
                  <LeadCard key={c.id} c={c} stage={st.key}
                    onDragStart={() => setDragId(c.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => onOpen(c.id)} onViewMap={onViewMap} dragging={dragId === c.id} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function LeadCard({ c, stage, onDragStart, onDragEnd, onClick, onViewMap, dragging }) {
  const jackie = stage === "jackie";
  const booked = stage === "booked";
  const unread = c.thread ? c.thread.filter((m) => m.from === "lead" && !m.read).length : 0;
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      style={{ border: `1px solid ${c.fresh ? C.accent : C.line}`, borderRadius: 13, padding: 15, background: "#fff", cursor: "pointer",
        boxShadow: c.fresh ? "0 0 0 3px rgba(194,99,42,.12)" : "0 1px 3px rgba(0,0,0,.04)",
        opacity: dragging ? 0.4 : 1, transition: "box-shadow .3s, opacity .15s", animation: c.fresh ? "ghPop .35s ease" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>{c.name}</div>
        {c.fresh && <span style={{ marginLeft: "auto", background: C.accentSoft, color: C.accent, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>NEW</span>}
        {!c.fresh && unread > 0 && <span style={{ marginLeft: "auto", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 5px" }}>{unread}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, margin: "9px 0", color: C.sub, fontSize: 13 }}>
        <button onClick={(e) => { e.stopPropagation(); onViewMap && onViewMap(c.id); }} title="View on map"
          style={{ display: "flex", gap: 7, alignItems: "center", border: "none", background: "none", padding: 0, cursor: "pointer", color: C.accent, font: "inherit", fontSize: 13, textAlign: "left" }}>
          <MapPin size={13} /> <span style={{ textDecoration: "underline", textDecorationStyle: "dotted" }}>{c.addr}</span>
        </button>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}><Phone size={13} /> {c.phone}</span>
        <span style={{ display: "flex", gap: 7, alignItems: "flex-start" }}><MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0 }} /> {c.msg}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 12, color: C.sub }}><Clock size={12} style={{ verticalAlign: -2 }} /> {typeof c.days === "number" ? `${c.days} days` : c.days}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: booked ? C.green : jackie ? C.blue : C.accent, display: "inline-flex", alignItems: "center", gap: 5 }}>
          {booked ? <><CalendarCheck size={13} /> Booked</> : jackie ? <><Sparkles size={13} /> Jackie</> : <><Reply size={13} /> Open thread</>}
        </span>
      </div>
    </div>
  );
}

/* ---------------- SMS THREAD (drawer) ---------------- */
function Thread({ lead, onClose, onSendReply, onBook, onViewMap }) {
  const [draft, setDraft] = useState("");
  const endRef = React.useRef(null);
  React.useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: "smooth" }); }, [lead && lead.thread && lead.thread.length]);
  if (!lead) return null;
  const send = () => { if (draft.trim()) { onSendReply(lead.id, draft.trim()); setDraft(""); } };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,32,.45)", zIndex: 70, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>{lead.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16.5, color: C.ink }}>{lead.name}</div>
            <div style={{ fontSize: 13, color: C.sub }}>{lead.phone} · {lead.addr}</div>
            {lead.x != null && (
              <button onClick={() => onViewMap && onViewMap(lead.id)} style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: C.accentSoft, color: C.accent, borderRadius: 7, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <MapPin size={13} /> View on map
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ border: "none", background: C.panel, borderRadius: 9, padding: 9, cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, background: "#fafbfc", display: "flex", flexDirection: "column", gap: 10 }}>
          {(lead.thread || []).map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === "us" ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{ background: m.from === "us" ? C.accent : "#fff", color: m.from === "us" ? "#fff" : C.ink, border: m.from === "us" ? "none" : `1px solid ${C.line}`, borderRadius: 16, padding: "10px 14px", fontSize: 14, lineHeight: 1.45, boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>{m.text}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3, textAlign: m.from === "us" ? "right" : "left", display: "flex", alignItems: "center", gap: 4, justifyContent: m.from === "us" ? "flex-end" : "flex-start" }}>
                {m.from === "ai" && <><Sparkles size={11} color={C.blue} /> Jackie · </>}{m.time}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div style={{ padding: 14, borderTop: `1px solid ${C.line}` }}>
          {lead.stage !== "booked" && (
            <button onClick={() => onBook(lead.id)} style={{ width: "100%", marginBottom: 10, background: C.greenSoft, color: C.green, border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <CalendarCheck size={16} /> Mark as Booked
            </button>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a reply…" rows={1} style={{ flex: 1, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 14, fontFamily: body, resize: "none", maxHeight: 120, boxSizing: "border-box" }} />
            <button onClick={send} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 12, width: 44, height: 44, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><SendIcon size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- TEMPLATES ---------------- */
function Templates() {
  return (
    <>
      <Header title="Message Templates" sub="Manage message templates" action={<Btn primary icon={Plus}>Create New Template</Btn>} />
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.3fr", padding: "14px 18px", background: C.panel, fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}` }}>
          <span>Template Name</span><span>Type</span><span>Status</span><span>Automation Enabled</span>
        </div>
        {TEMPLATES.map((t, i) => (
          <div key={t} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.3fr", padding: "16px 18px", alignItems: "center", borderBottom: i < TEMPLATES.length - 1 ? `1px solid ${C.line}` : "none", fontSize: 14.5, color: C.ink }}>
            <span style={{ fontWeight: 600 }}>{t}</span>
            <span style={{ color: C.sub }}>Text</span>
            <span><Pill>Live</Pill></span>
            <span><div style={{ width: 13, height: 13, borderRadius: "50%", background: "#cdd3dc" }} /></span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- CAMPAIGN TEMPLATES ---------------- */
function Campaigns() {
  const cards = [
    { t: "Spring Exterior Push", d: "Multi-touch SMS + email over 10 days for high-value homes." },
    { t: "Neighborhood Blitz", d: "Single SMS to a freshly revealed prospect group." },
    { t: "Re-quote Follow-up", d: "3-step nudge for quoted-but-not-closed leads." },
    { t: "Past Client Refresh", d: "Cross-sell to clients with jobs older than 18 months." },
  ];
  return (
    <>
      <Header title="Campaign Templates" sub="Reusable multi-step outreach sequences" action={<Btn primary icon={Plus}>New Campaign Template</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.t} style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentSoft, display: "grid", placeItems: "center" }}><Megaphone size={19} color={C.accent} /></div>
              <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{c.t}</span>
            </div>
            <p style={{ color: C.sub, fontSize: 14, margin: "14px 0 16px", lineHeight: 1.5 }}>{c.d}</p>
            <div style={{ display: "flex", gap: 8 }}><Pill tone="amber">SMS</Pill><Pill>Email</Pill></div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- AUTOMATIONS ---------------- */
function Automations() {
  const [msg, setMsg] = useState("");
  return (
    <>
      <Header title="Automations" sub="Manage automated actions" />
      <div style={{ display: "flex", gap: 10, borderBottom: `1px solid ${C.line}`, marginBottom: 22 }}>
        <button style={{ border: "none", background: "none", padding: "10px 4px", fontWeight: 700, color: C.accent, borderBottom: `2px solid ${C.accent}`, marginBottom: -1, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}><Sparkles size={16} /> AI Responder</button>
        <button style={{ border: "none", background: "none", padding: "10px 4px", fontWeight: 600, color: C.sub, cursor: "pointer" }}>Actions</button>
      </div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", padding: 22, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: C.ink }}>AI Responder</span>
          <Pill tone="amber">Requires Universal Credits</Pill>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button style={{ width: 180, border: `1.5px dashed ${C.blue}`, borderRadius: 14, display: "grid", placeItems: "center", color: C.blue, fontWeight: 700, gap: 8, cursor: "pointer", background: "#f5f8ff", padding: 30 }}>
            <Plus size={22} /> New Agent
          </button>
          <div style={{ width: 240, border: `2px solid ${C.accent}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 10 }}>Jackie</div>
            {[["Description", "Hot Lead Phone Connect"], ["Goal", "Phone Connect"], ["Personality", "Casual"]].map(([k, v]) => (
              <div key={k} style={{ fontSize: 14, marginBottom: 5 }}><b style={{ color: C.ink }}>{k}:</b> <span style={{ color: C.sub }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", padding: 22 }}>
        <h3 style={{ fontFamily: font, fontSize: 21, fontWeight: 600, color: C.ink, margin: "0 0 8px" }}>Start a new conversation demo</h3>
        <p style={{ color: C.sub, fontSize: 14.5, margin: "0 0 16px" }}>Paste the outreach SMS your team would send, then play the prospect's side to see how the AI responds.</p>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Outreach Message</label>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hi there! We're offering free roof inspections in your area this month. Would you be interested?"
          style={{ width: "100%", minHeight: 110, marginTop: 8, padding: 14, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, fontFamily: body, resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ background: C.panel, borderRadius: 10, padding: "12px 14px", margin: "12px 0", fontSize: 13.5, color: C.sub }}>
          <b>Demo lead:</b> Alex Johnson &nbsp;·&nbsp; (555) 867-5309 &nbsp;·&nbsp; 742 Evergreen Terrace, Springfield, IL
        </div>
        <button style={{ width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Start Conversation</button>
      </div>
    </>
  );
}

/* ---------------- SETTINGS ---------------- */
function SettingsView() {
  const tabs = ["Company details", "Manage users", "Integrations", "Landing page"];
  const [tab, setTab] = useState(0);
  return (
    <>
      <Header title="Settings" />
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.line}`, marginBottom: 24 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ border: "none", background: "none", padding: "10px 14px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: tab === i ? C.accent : C.sub, borderBottom: tab === i ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1 }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div style={{ maxWidth: 620, border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
          {[["Company Name", "Wow 1 Day Painting - Orlando"], ["Company Type", "Painting"], ["Company Address", "2411 West Sand Lake Road, Orlando, FL 32809"], ["Company Website", "https://www.wow1day.com/"], ["Phone Number", "(407) 227-3890"]].map(([k, v]) => (
            <div key={k}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>{k}</label>
              <input defaultValue={v} style={{ width: "100%", marginTop: 6, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, boxSizing: "border-box" }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>Property Types</label>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {[["Single Family Residences", true], ["Apartments", false], ["Condos", false]].map(([k, on]) => (
                <label key={k} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 14.5, color: C.ink }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? C.accent : C.line}`, background: on ? C.accent : "#fff", display: "grid", placeItems: "center" }}>{on && <Check size={13} color="#fff" />}</span>{k}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", overflow: "hidden" }}>
          <div style={{ padding: 18 }}><Btn icon={Plus}>Add user</Btn></div>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1.2fr 1fr", padding: "14px 18px", background: C.panel, fontSize: 13, fontWeight: 700, color: C.ink }}>
            <span>User name</span><span>User email</span><span>Access</span><span>Status</span>
          </div>
          {[["Melanie Michaels", "melanie@wow1day.com", "Org Admin", "Invited", false], ["Michael Baitelli", "michel.baitelli@wow1day.com", "Org Admin", "Active", true], ["Joao Pedro Baitelli", "jpbaitelli@gmail.com", "Org Admin", "Invited", false], ["Kauan Rupp", "kauan.rupp@wow1day.com", "Org Admin", "Invited", false]].map(([n, e, a, s, act], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1.2fr 1fr", padding: "15px 18px", borderTop: `1px solid ${C.line}`, fontSize: 14.5, alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: C.ink }}>{n}</span>
              <span style={{ color: C.blue }}>{e}</span>
              <span style={{ color: C.sub }}>{a}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.sub }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: act ? C.green : C.blue }} />{s}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 2 && (
        <div style={{ maxWidth: 680 }}>
          <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 600, color: C.ink }}>Integrations</h2>
          <p style={{ color: C.sub, marginTop: 4 }}>You asked to keep it lean — SMS and email only.</p>
          {[["SMS Messaging", "Send and receive texts with prospects and leads.", true, MessageSquare], ["Email", "Send campaign emails and follow-ups.", true, Mail]].map(([n, d, active, I]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 16, border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", padding: "18px 20px", marginTop: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: C.greenSoft, display: "grid", placeItems: "center" }}><I size={21} color={C.green} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>{n} <Pill>Active</Pill></div>
                <div style={{ color: C.sub, fontSize: 14, marginTop: 3 }}>{d}</div>
              </div>
              <Btn icon={Cog}>Configure</Btn>
            </div>
          ))}
        </div>
      )}

      {tab === 3 && (
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 320, border: `1px solid ${C.line}`, borderRadius: 16, background: "#fff", padding: 26 }}>
            <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: C.ink, margin: "0 0 18px" }}>Customize Landing Page</h3>
            {[["Company Name", "Wow 1 Day Painting - Orlando"], ["Button Text", "Visit us"], ["Button Link", "https://www.wow1day.com/locations/orlando"]].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>{k}</label>
                <input defaultValue={v} style={{ width: "100%", marginTop: 6, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14.5, boxSizing: "border-box" }} />
              </div>
            ))}
            <Btn primary>Save Changes</Btn>
          </div>
          <div style={{ width: 280 }}>
            <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: C.ink, margin: "0 0 18px" }}>Preview</h3>
            <div style={{ border: "8px solid #16202e", borderRadius: 30, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: "#eef0f3", padding: "8px 14px", fontSize: 12, color: C.sub }}>wow1daypaintingorlando.com</div>
              <div style={{ padding: 20, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: C.ink, marginBottom: 14 }}>Wow 1 Day Painting</div>
                <div style={{ height: 120, background: "linear-gradient(135deg,#1b2735,#2f6df0)", borderRadius: 12, marginBottom: 16 }} />
                <button style={{ background: "#8dc73f", border: "none", borderRadius: 9, padding: "11px 20px", fontWeight: 700, color: "#16202e", cursor: "pointer" }}>Visit us ›</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- ROOT ---------------- */
export default function App() {
  const [active, setActive] = useState("salesboard");
  const [settingsActive, setSettingsActive] = useState(false);
  // ---- LIVE DATA via Supabase (replaces the old in-memory state) ----
  const {
    groups, campaigns, leads, loading,
    createGroup, sendCampaign: hookSendCampaign, sendReply: hookSendReply,
    moveLead: hookMoveLead, bookLead: hookBookLead, markRead, refresh,
  } = useGlassHouse();

  const [openLeadId, setOpenLeadId] = useState(null);
  const [focusLeadId, setFocusLeadId] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg, ms = 3500) => { setToast(msg); setTimeout(() => setToast(null), ms); };

  // Reveal map → create a real group (+ its prospects) in the database
  const addGroup = async (g) => {
    try {
      await createGroup(g);
      flash(`“${g.name}” (${g.contacts}) added to Outreach`);
    } catch (e) { flash("Couldn't create group: " + e.message, 5000); }
  };

  // Outreach → send a real campaign through the edge function
  const sendCampaign = async (payload) => {
    try {
      const res = await hookSendCampaign(payload);
      flash(`Sent “${payload.group}” to ${res?.sent ?? payload.contacts} via ${payload.channel.toUpperCase()} — see Sales Board`, 4000);
      setActive("salesboard");
    } catch (e) { flash("Send failed: " + e.message, 5000); }
  };

  const findLead = (id) => {
    for (const k of ["jackie", "needsAttention", "booked"]) {
      const f = leads[k].find((c) => c.id === id);
      if (f) return f;
    }
    return null;
  };

  const moveLead = (id, toCol) => hookMoveLead(id, toCol);

  const openLead = (id) => { setOpenLeadId(id); markRead(id); };

  const sendReply = async (id, text) => {
    try { await hookSendReply(id, text); }
    catch (e) { flash("Reply failed: " + e.message, 5000); }
  };

  const bookLead = (id) => { hookBookLead(id); flash("Lead marked as Booked 🎉", 3000); };

  const allLeads = [...leads.jackie, ...leads.needsAttention, ...leads.booked];
  const viewLeadOnMap = (id) => { setFocusLeadId(id); setOpenLeadId(null); setActive("reveal"); setSettingsActive(false); };

  const sentGroupNames = campaigns.map((c) => c.group);
  const openLeadObj = openLeadId ? findLead(openLeadId) : null;
  const focusLeadObj = focusLeadId ? findLead(focusLeadId) : null;

  const view = useMemo(() => {
    if (settingsActive) return <SettingsView />;
    switch (active) {
      case "reveal": return HAS_MAPS_KEY
        ? <RevealMap onCreateGroup={addGroup} boardLeads={allLeads} focusLead={focusLeadObj} onOpenLead={openLead} clearFocus={() => setFocusLeadId(null)} />
        : <Reveal onCreateGroup={addGroup} goOutreach={() => { setActive("outreach"); setSettingsActive(false); }} boardLeads={allLeads} focusLead={focusLeadObj} onOpenLead={openLead} clearFocus={() => setFocusLeadId(null)} />;
      case "reengage": return <ReEngage />;
      case "outreach": return <Outreach groups={groups} onSend={sendCampaign} sentGroupNames={sentGroupNames} />;
      case "salesboard": return <SalesBoard campaigns={campaigns} leads={leads} goOutreach={() => { setActive("outreach"); setSettingsActive(false); }} onMove={moveLead} onOpen={openLead} onViewMap={viewLeadOnMap} onReset={refresh} />;
      case "templates": return <Templates />;
      case "campaigns": return <Campaigns />;
      case "automations": return <Automations />;
      default: return <SalesBoard campaigns={campaigns} leads={leads} goOutreach={() => setActive("outreach")} onMove={moveLead} onOpen={openLead} onViewMap={viewLeadOnMap} onReset={refresh} />;
    }
  }, [active, settingsActive, groups, campaigns, leads, focusLeadObj]);

  const fullBleed = active === "reveal" && !settingsActive;

  if (loading) {
    return (
      <div style={{ fontFamily: body, height: "100vh", display: "grid", placeItems: "center", background: C.panel, color: C.sub }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 38, height: 38, border: `3px solid ${C.line}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 14px", animation: "ghSpin .8s linear infinite" }} />
          Loading your board…
          <style>{`@keyframes ghSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: body, color: C.ink, height: "100vh", display: "flex", background: C.panel }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap');
        *{box-sizing:border-box} input::placeholder,textarea::placeholder{color:#98a2b3}
        @keyframes ghPop{0%{transform:scale(.96);opacity:.4}60%{transform:scale(1.01)}100%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:8px}`}</style>
      <Sidebar active={active} setActive={setActive} settingsActive={settingsActive} setSettingsActive={setSettingsActive} outreachCount={groups.length} />
      <main style={{ flex: 1, overflowY: "auto", padding: fullBleed ? 20 : "32px 40px" }}>
        <div style={{ maxWidth: fullBleed ? "none" : (active === "salesboard" && !settingsActive ? 1380 : 1180), margin: "0 auto", height: fullBleed ? "100%" : "auto" }}>
          {view}
        </div>
      </main>
      <Thread lead={openLeadObj} onClose={() => setOpenLeadId(null)} onSendReply={sendReply} onBook={bookLead} onViewMap={viewLeadOnMap} />
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "13px 20px", borderRadius: 12, fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 28px rgba(0,0,0,.3)", zIndex: 50 }}>
          <Check size={17} color="#7ee2a8" /> {toast}
        </div>
      )}
    </div>
  );
}
