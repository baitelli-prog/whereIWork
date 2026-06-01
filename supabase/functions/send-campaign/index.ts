// supabase/functions/send-campaign/index.ts
// Sends an SMS or email campaign to every contactable prospect in a group,
// then records the campaign + a lead + the outbound message for each.
//
// Deploy:  supabase functions deploy send-campaign
// Call (from app, user must be logged in):
//   POST { group_id, channel: "sms"|"email", template, body, subject? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendSMS, sendEmail, applyMerge } from "../_shared/messaging.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Client scoped to the caller's JWT → RLS applies automatically.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { group_id, channel, template, body, subject } = await req.json();
    if (!group_id || !channel || !body) return json({ error: "missing fields" }, 400);

    // which company? (first membership)
    const { data: mem } = await supabase.from("memberships").select("company_id").limit(1).single();
    const company_id = mem?.company_id;
    if (!company_id) return json({ error: "no company" }, 403);

    // load the group's prospects (RLS guarantees they're this company's)
    const { data: prospects, error: pErr } = await supabase
      .from("prospects").select("*").eq("group_id", group_id);
    if (pErr) throw pErr;

    // suppression list for this company + channel
    const { data: supp } = await supabase
      .from("suppressions").select("address").eq("company_id", company_id).eq("channel", channel);
    const suppressed = new Set((supp ?? []).map((s) => s.address));

    // create the campaign row
    const { data: campaign, error: cErr } = await supabase.from("campaigns")
      .insert({ company_id, group_id, channel, template, body, subject }).select().single();
    if (cErr) throw cErr;

    let sent = 0, skipped = 0;
    for (const p of prospects ?? []) {
      const addr = channel === "sms" ? p.phone : p.email;
      // compliance gate: skip DNC, prior opt-out, suppression list, or missing address
      if (!addr || p.dnc || p.opted_out || suppressed.has(addr)) { skipped++; continue; }

      const firstName = (p.name ?? "").split(" ")[0];
      const street = (p.address ?? "").split(",")[0];
      const text = applyMerge(body, { first_name: firstName, street });

      const result = channel === "sms"
        ? await sendSMS(addr, text)
        : await sendEmail(addr, applyMerge(subject ?? "", { first_name: firstName, street }), `<p>${text}</p>`);

      // create a lead on the board for this prospect
      const { data: lead } = await supabase.from("leads").insert({
        company_id, prospect_id: p.id, campaign_id: campaign.id,
        name: p.name, address: p.address, phone: p.phone, lat: p.lat, lng: p.lng,
        stage: "needsAttention",
      }).select().single();

      // record the outbound message
      if (lead) {
        await supabase.from("messages").insert({
          company_id, lead_id: lead.id, direction: "out", sender: "us",
          channel, body: text, provider_sid: result.sid,
          status: result.ok ? "sent" : "failed",
        });
      }
      if (result.ok) sent++; else skipped++;
    }

    // mark group as sent
    await supabase.from("prospect_groups").update({ status: "sent" }).eq("id", group_id);

    return json({ campaign_id: campaign.id, sent, skipped });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
