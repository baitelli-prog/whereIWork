// src/main.jsx — wrap your app in the AuthGate.
//
// Before: <App /> rendered directly.
// After:  <App /> only renders for signed-in users; otherwise the login screen.

import React from "react";
import ReactDOM from "react-dom/client";
import { AuthGate } from "./Auth";
import App from "./App";   // your existing GlassHouse app

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);

// ---------------------------------------------------------------------------
// Add a Sign out control inside your App's sidebar. Anywhere in App.jsx:
//
//   import { useAuth } from "./Auth";
//   ...
//   const { user, signOut } = useAuth();
//   ...
//   // in the sidebar footer, replace the static "Michael Baitelli" block with:
//   <div style={{ display:"flex", alignItems:"center", gap:11, padding:"16px 8px 0" }}>
//     <div style={{ width:34,height:34,borderRadius:"50%",background:"#16202e",
//          color:"#fff",display:"grid",placeItems:"center",fontSize:13,fontWeight:700 }}>
//       {user.email.slice(0,2).toUpperCase()}
//     </div>
//     <div style={{ lineHeight:1.3, flex:1, overflow:"hidden" }}>
//       <div style={{ fontSize:14,fontWeight:700,color:"#16202e",
//            whiteSpace:"nowrap",textOverflow:"ellipsis",overflow:"hidden" }}>{user.email}</div>
//       <button onClick={signOut} style={{ border:"none",background:"none",
//            color:"#667085",fontSize:12.5,cursor:"pointer",padding:0 }}>Sign out</button>
//     </div>
//   </div>
// ---------------------------------------------------------------------------
