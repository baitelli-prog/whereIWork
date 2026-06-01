// Shared CORS headers. Edge Functions don't add CORS automatically — you must.
// In production, replace "*" with your actual domain(s) for tighter security.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
