// Bytes-sent ledger: wraps fetch once, counts every outgoing request body.
import { useEffect, useState } from "react";

export type LedgerEntry = { ts: string; endpoint: string; bytes: number; contents: string };

const entries: LedgerEntry[] = [];
const listeners = new Set<() => void>();
let installed = false;

function notify() {
  for (const l of listeners) l();
}

export function installLedger() {
  if (installed) return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = init?.body;
    let bytes = 0;
    if (typeof body === "string") bytes = new TextEncoder().encode(body).byteLength;
    else if (body instanceof ArrayBuffer) bytes = body.byteLength;
    else if (ArrayBuffer.isView(body)) bytes = body.byteLength;
    else if (body instanceof Blob) bytes = body.size;
    if (bytes > 0) {
      const headers = (init?.headers || {}) as Record<string, string>;
      const contents = headers["X-Ledger-Note"] || "request body";
      entries.push({ ts: new Date().toISOString(), endpoint: url, bytes, contents });
      notify();
    }
    return orig(input, init);
  };
}

export function ledgerEntries() {
  return entries.slice();
}
export function ledgerTotal() {
  return entries.reduce((s, e) => s + e.bytes, 0);
}
export function subscribeLedger(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useLedger() {
  const [, tick] = useState(0);
  useEffect(() => subscribeLedger(() => tick((t) => t + 1)), []);
  return { entries: ledgerEntries(), total: ledgerTotal() };
}
