// src/lib/db.js — all GlassHouse data access in one place.
// The UI never touches Supabase directly; it calls these functions.
// RLS on the backend guarantees every query is scoped to the user's company.

import { supabase } from "./supabase";

/* ---------- reads ---------- */

export async function fetchGroups() {
  const { data, error } = await supabase
    .from("prospect_groups")
    .select("id, name, source, status, created_at, prospects(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((g) => ({
    id: g.id,
    name: g.name,
    source: g.source,
    status: g.status,
    contacts: g.prospects?.[0]?.count ?? 0,
    date: new Date(g.created_at).toLocaleDateString("en-US"),
  }));
}

export async function fetchCampaigns() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, channel, template, body, sent_count, created_at, prospect_groups(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    channel: c.channel,
    template: c.template,
    body: c.body,
    contacts: c.sent_count,
    group: c.prospect_groups?.name ?? "—",
    sentAt: new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  }));
}

// Returns leads grouped by stage, each with its message thread.
export async function fetchLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, address, phone, lat, lng, stage, opted_out, updated_at, messages(id, direction, sender, body, status, created_at)")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const byStage = { jackie: [], needsAttention: [], booked: [] };
  for (const l of data || []) {
    const thread = (l.messages || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((m) => ({
        from: m.sender,
        text: m.body,
        time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        read: m.direction === "out" || m.status === "read",
      }));
    const last = thread[thread.length - 1];
    const card = {
      id: l.id, name: l.name, addr: l.address, phone: l.phone,
      x: l.lng, y: l.lat,            // (real map uses lat/lng directly; see note in guide)
      area: "", days: relativeDays(l.updated_at),
      msg: last?.text ?? "", stage: l.stage, thread, optedOut: l.opted_out,
    };
    (byStage[l.stage] || byStage.needsAttention).push(card);
  }
  return byStage;
}

function relativeDays(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 86400000);
  return d <= 0 ? "today" : `${d}`;
}

/* ---------- writes ---------- */

// Create a group + insert its reviewed prospects. `prospects` come from the
// map's review panel (already DNC-scrubbed by the prospects function).
export async function createGroup({ name, source = "Reveal", geometry, prospects = [] }) {
  // company_id is filled by the DB default? No — set it from membership.
  const { data: mem } = await supabase.from("memberships").select("company_id").limit(1).single();
  const company_id = mem.company_id;

  const { data: group, error } = await supabase
    .from("prospect_groups").insert({ company_id, name, source, geometry }).select().single();
  if (error) throw error;

  if (prospects.length) {
    const rows = prospects.map((p) => ({
      group_id: group.id, company_id,
      name: p.name, address: p.addr, phone: p.phone, email: p.email ?? null,
      home_value: p.value, equity: p.equity, beds: p.beds, sqft: p.sqft, year_built: p.year,
      lat: p.lat, lng: p.lng, dnc: false,
    }));
    const { error: pErr } = await supabase.from("prospects").insert(rows);
    if (pErr) throw pErr;
  }
  return { ...group, contacts: prospects.length };
}

export async function sendCampaign({ group_id, channel, template, body, subject }) {
  const { data, error } = await supabase.functions.invoke("send-campaign",
    { body: { group_id, channel, template, body, subject } });
  if (error) throw error;
  return data; // { campaign_id, sent, skipped }
}

export async function sendReply(lead_id, body) {
  const { data, error } = await supabase.functions.invoke("send-reply",
    { body: { lead_id, body } });
  if (error) throw error;
  return data;
}

export async function moveLead(lead_id, stage) {
  const { error } = await supabase.from("leads")
    .update({ stage, updated_at: new Date().toISOString() }).eq("id", lead_id);
  if (error) throw error;
}

export const bookLead = (lead_id) => moveLead(lead_id, "booked");

/* ---------- realtime ---------- */
// Calls onChange() whenever leads or messages change for this company,
// so inbound SMS replies appear on the board with no refresh.
export function subscribeToBoard(onChange) {
  const ch = supabase
    .channel("board")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
