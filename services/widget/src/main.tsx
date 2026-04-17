import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
import { DEFAULT_TENANT_ID } from "./lib/constants";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App config={{ tenantId: DEFAULT_TENANT_ID }} />
  </React.StrictMode>
);
