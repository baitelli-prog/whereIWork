// supabase/functions/send-reply/index.ts
// Sends a one-off reply to a lead from the Sales Board thread, records it.
//
// Deploy:  supabase functions deploy send-reply
// Call:    POST { lead_id, body }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendSMS } from "../_shared/messaging.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { lead_id, body } = await req.json();
    if (!lead_id || !body) return json({ error: "missing fields" }, 400);

    // RLS ensures this lead belongs to the caller's company
    const { data: lead, error } = await supabase
      .from("leads").select("*").eq("id", lead_id).single();
    if (error || !lead) return json({ error: "lead not found" }, 404);
    if (lead.opted_out) return json({ error: "lead has opted out" }, 409);

    const result = await sendSMS(lead.phone, body);

    await supabase.from("messages").insert({
      company_id: lead.company_id, lead_id, direction: "out", sender: "us",
      channel: "sms", body, provider_sid: result.sid,
      status: result.ok ? "sent" : "failed",
    });
    await supabase.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", lead_id);

    if (!result.ok) return json({ error: result.error }, 502);
    return json({ ok: true, sid: result.sid });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
