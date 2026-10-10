import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installLedger } from "./state/ledger";
import "./index.css";

installLedger();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
