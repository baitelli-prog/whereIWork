// supabase/functions/_shared/messaging.ts
// Thin wrappers around Twilio (SMS) and Resend (email). Keys come from secrets.

const TWILIO_SID = () => Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = () => Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM = () => Deno.env.get("TWILIO_FROM_NUMBER") ?? ""; // or Messaging Service SID
const RESEND_KEY = () => Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = () => Deno.env.get("EMAIL_FROM") ?? "GlassHouse <hello@example.com>";

export interface SendResult { ok: boolean; sid?: string; error?: string; }

// ---- SMS via Twilio ----
export async function sendSMS(to: string, body: string): Promise<SendResult> {
  const sid = TWILIO_SID(), token = TWILIO_TOKEN(), from = TWILIO_FROM();
  if (!sid || !token || !from) {
    // not configured yet — simulate so the pipe works end-to-end
    return { ok: true, sid: "SIMULATED_" + crypto.randomUUID() };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, Body: body });
  // From can be a phone number (+1...) or a Messaging Service SID (MG...)
  if (from.startsWith("MG")) form.set("MessagingServiceSid", from);
  else form.set("From", from);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message || `twilio ${res.status}` };
  return { ok: true, sid: data.sid };
}

// ---- Email via Resend ----
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const key = RESEND_KEY();
  if (!key) return { ok: true, sid: "SIMULATED_" + crypto.randomUUID() };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM(), to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message || `resend ${res.status}` };
  return { ok: true, sid: data.id };
}

// fill {{first_name}} / {{street}} merge tags
export function applyMerge(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
