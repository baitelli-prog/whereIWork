// src/hooks/useGlassHouse.js
// Loads groups/campaigns/leads from Supabase and keeps them live.
// Exposes the SAME shape your prototype's App already uses, so wiring it in
// is mostly deleting the old useState/handlers and reading from here instead.

import { useState, useEffect, useCallback, useRef } from "react";
import * as db from "../lib/db";

const EMPTY_LEADS = { jackie: [], needsAttention: [], booked: [] };

export function useGlassHouse() {
  const [groups, setGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState(EMPTY_LEADS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [g, c, l] = await Promise.all([db.fetchGroups(), db.fetchCampaigns(), db.fetchLeads()]);
      setGroups(g); setCampaigns(c); setLeads(l);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  // just the board (leads) — used by realtime so we don't refetch everything
  const reloadLeads = useCallback(async () => {
    try { setLeads(await db.fetchLeads()); } catch (e) { /* ignore transient */ }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // realtime: inbound SMS / lead changes refresh the board automatically
  useEffect(() => {
    const unsub = db.subscribeToBoard(() => reloadLeads());
    return unsub;
  }, [reloadLeads]);

  /* ---- actions (optimistic where it helps, then reconcile) ---- */

  const createGroup = useCallback(async (payload) => {
    const g = await db.createGroup(payload);
    setGroups((prev) => [{
      id: g.id, name: g.name, source: g.source || "Reveal", status: "ready",
      contacts: g.contacts, date: new Date().toLocaleDateString("en-US"),
    }, ...prev]);
    return g;
  }, []);

  const sendCampaign = useCallback(async (payload) => {
    const res = await db.sendCampaign(payload);
    await loadAll(); // campaign + new leads created server-side
    return res;
  }, [loadAll]);

  const sendReply = useCallback(async (leadId, text) => {
    // optimistic: append our message immediately
    setLeads((prev) => mapLead(prev, leadId, (c) => ({
      ...c, thread: [...c.thread, { from: "us", text, time: now(), read: true }], msg: text,
    })));
    try { await db.sendReply(leadId, text); } finally { reloadLeads(); }
  }, [reloadLeads]);

  const moveLead = useCallback(async (leadId, stage) => {
    // optimistic move between columns
    setLeads((prev) => {
      let card = null;
      const next = { jackie: [], needsAttention: [], booked: [] };
      for (const k of Object.keys(prev)) for (const c of prev[k]) {
        if (c.id === leadId) card = { ...c, stage };
        else next[k].push(c);
      }
      if (card) next[stage].unshift(card);
      return next;
    });
    try { await db.moveLead(leadId, stage); } finally { reloadLeads(); }
  }, [reloadLeads]);

  const bookLead = useCallback((leadId) => moveLead(leadId, "booked"), [moveLead]);

  const markRead = useCallback((leadId) => {
    setLeads((prev) => mapLead(prev, leadId, (c) => ({
      ...c, thread: c.thread.map((m) => ({ ...m, read: true })),
    })));
  }, []);

  return {
    groups, campaigns, leads, loading, error,
    createGroup, sendCampaign, sendReply, moveLead, bookLead, markRead,
    refresh: loadAll,
  };
}

/* helpers */
const now = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
function mapLead(stages, id, fn) {
  const next = {};
  for (const k of Object.keys(stages)) next[k] = stages[k].map((c) => (c.id === id ? fn(c) : c));
  return next;
}
