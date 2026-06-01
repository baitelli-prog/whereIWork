// supabase/functions/sms-inbound/index.ts
// Twilio calls this URL whenever someone texts your number.
// It: (1) validates the request is really from Twilio,
//     (2) handles STOP/START opt-out,
//     (3) records the inbound message against the matching lead,
//     (4) replies with empty TwiML (Twilio auto-sends STOP confirmations).
//
// Deploy:  supabase functions deploy sms-inbound --no-verify-jwt
//   (--no-verify-jwt because Twilio can't send a Supabase JWT; we verify the
//    Twilio signature instead.)
// Point your Twilio number's "A MESSAGE COMES IN" webhook at this function URL.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import twilio from "https://esm.sh/twilio@5";

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
const START_WORDS = ["START", "YES", "UNSTOP"];

Deno.serve(async (req) => {
  const url = Deno.env.get("SMS_INBOUND_URL") ?? req.url; // exact public URL Twilio calls
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";

  // Twilio sends application/x-www-form-urlencoded
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = req.headers.get("X-Twilio-Signature") ?? "";

  // 1) verify the signature (skip only if no token configured, e.g. local dev)
  if (token) {
    const valid = twilio.validateRequest(token, signature, url, params);
    if (!valid) return new Response("invalid signature", { status: 403 });
  }

  const from = params.From;           // sender's phone, E.164
  const bodyText = (params.Body ?? "").trim();
  const upper = bodyText.toUpperCase();

  // service-role client: webhook isn't a logged-in user, so it bypasses RLS.
  // (Safe because we only reach it after signature validation.)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // find the most recent lead with this phone to attribute the message + company
  const { data: lead } = await admin.from("leads")
    .select("id, company_id").eq("phone", from)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();

  // 2) opt-out / opt-in handling
  if (STOP_WORDS.includes(upper)) {
    if (lead) {
      await admin.from("suppressions").upsert(
        { company_id: lead.company_id, channel: "sms", address: from, reason: "opt_out" },
        { onConflict: "company_id,channel,address" });
      await admin.from("leads").update({ opted_out: true }).eq("phone", from);
      await admin.from("prospects").update({ opted_out: true }).eq("phone", from);
    }
    return twiml(); // Twilio itself sends the opt-out confirmation
  }
  if (START_WORDS.includes(upper) && lead) {
    await admin.from("suppressions").delete()
      .eq("company_id", lead.company_id).eq("channel", "sms").eq("address", from);
    await admin.from("leads").update({ opted_out: false }).eq("phone", from);
  }

  // 3) record the inbound message
  if (lead) {
    await admin.from("messages").insert({
      company_id: lead.company_id, lead_id: lead.id,
      direction: "in", sender: "lead", channel: "sms",
      body: bodyText, provider_sid: params.MessageSid, status: "received",
    });
    await admin.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", lead.id);
  }
  // If no lead matched, you could create one here from `from` — left out for clarity.

  // 4) respond fast with empty TwiML
  return twiml();
});

function twiml() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200, headers: { "Content-Type": "text/xml" },
  });
}
