import React from "react";
import ReactDOM from "react-dom/client";
import { AuthGate } from "./Auth";
import App from "./GlassHouse";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
