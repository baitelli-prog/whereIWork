// src/Auth.jsx — login / signup gate for GlassHouse.
//
// Wraps your app: shows a sign-in screen when logged out, your app when in.
// Uses the supabase client from ./lib/supabase.
//
// Usage in main.jsx / App:
//   import { AuthGate } from "./Auth";
//   <AuthGate><App /></AuthGate>
//
// The 0002 migration auto-creates a company + owner membership on signup,
// so a new user lands with RLS already working.

import React, { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "./lib/supabase";

const C = {
  ink: "#16202e", accent: "#c2632a", accentSoft: "#fbeee4",
  line: "#e4e7ec", sub: "#667085", panel: "#f5f6f8", green: "#1f9d57", red: "#c0392b",
};
const font = `'Fraunces', Georgia, serif`;
const body = `ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif`;

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <Splash>Loading…</Splash>;
  }
  if (!session) return <AuthScreen />;

  return (
    <AuthCtx.Provider value={{ session, user: session.user, signOut: () => supabase.auth.signOut() }}>
      {children}
    </AuthCtx.Provider>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  const submit = async () => {
    setMsg(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { company_name: company } },
        });
        if (error) throw error;
        setMsg({ type: "ok", text: "Check your email to confirm your account, then sign in." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will swap the view
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: body, background: `radial-gradient(1200px 600px at 70% -10%, #20304a 0%, ${C.ink} 55%)`, padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap');
        input:focus{outline:none;border-color:${C.accent} !important;box-shadow:0 0 0 3px ${C.accentSoft}}`}</style>

      <div style={{ width: "min(420px,100%)" }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center" }}>
            <div style={{ width: 15, height: 15, border: `2.4px solid ${C.ink}`, borderBottom: "none", borderRadius: "3px 3px 0 0" }} />
          </div>
          <span style={{ fontFamily: font, fontSize: 26, fontWeight: 600, color: "#fff", letterSpacing: -0.5 }}>GlassHouse</span>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, padding: 30, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
          <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ color: C.sub, fontSize: 14.5, margin: "0 0 22px" }}>
            {mode === "login" ? "Sign in to your sales board." : "Start reaching the right neighborhoods."}
          </p>

          {mode === "signup" && (
            <Field label="Company name" value={company} onChange={setCompany} placeholder="Wow 1 Day Painting - Orlando" />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"
            onEnter={submit} />

          {msg && (
            <div style={{ fontSize: 13.5, padding: "10px 12px", borderRadius: 9, marginBottom: 14,
              background: msg.type === "err" ? "#fdecea" : "#e6f6ec", color: msg.type === "err" ? C.red : C.green }}>
              {msg.text}
            </div>
          )}

          <button onClick={submit} disabled={busy || !email || !password}
            style={{ width: "100%", padding: 13, borderRadius: 11, border: "none", fontSize: 15.5, fontWeight: 700,
              cursor: busy ? "wait" : "pointer", background: (!email || !password) ? C.line : C.accent,
              color: (!email || !password) ? C.sub : "#fff", marginTop: 4 }}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 14, color: C.sub }}>
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
              style={{ border: "none", background: "none", color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#8aa0b6", fontSize: 12.5, marginTop: 18 }}>
          By continuing you agree to use outreach responsibly and in line with TCPA/DNC rules.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, onEnter }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        style={{ width: "100%", marginTop: 7, padding: "12px 14px", border: `1px solid ${C.line}`,
          borderRadius: 10, fontSize: 15, boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s" }} />
    </div>
  );
}

function Splash({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.ink, color: "#fff", fontFamily: body }}>
      {children}
    </div>
  );
}
