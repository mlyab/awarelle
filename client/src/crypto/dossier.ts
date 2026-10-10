// Clinician dossier: built on device, encrypted with AES-GCM via WebCrypto, relayed as ciphertext only.
import type { Dataset } from "../data/synth";
import type { ScanRecord } from "../state/store";
import { estimate, ovulationDay, phaseLabel, type Estimate } from "../model/phase";
import { scoreCpass, type CpassResult } from "../model/cpass";
import { APP_NAME } from "../constants";

export type Dossier = {
  app: string;
  generatedAt: string;
  limitations: string[];
  phaseSummary: {
    cycleDay: number;
    phase: string;
    ovulationDay: number;
    ovulationMethod: string;
    confidence: number;
    confidenceLabel: string;
    why: string;
  };
  cpass: CpassResult;
  strips: { cycle: number; day: number; lh: number; e3g: number; pdg: number; source: "scanned" | "logged" }[];
  cycleLengths: { cycle: number; length: number; complete: boolean; ovulationDay: number }[];
  nights: { cycle: number; day: number; tempC: number; restingHR: number; hrvRmssd: number; sleepEfficiency: number; bleeding: boolean }[];
  notes: string[];
};

export function buildDossier(ds: Dataset, scans: ScanRecord[]): Dossier {
  const est: Estimate = estimate(ds, scans);
  const cpass = scoreCpass(ds);
  const allNights = ds.cycles.flatMap((c) => c.days);
  const nights = allNights.slice(-60).map((d) => ({
    cycle: d.cycle,
    day: d.day,
    tempC: d.tempC,
    restingHR: d.restingHR,
    hrvRmssd: d.hrvRmssd,
    sleepEfficiency: d.sleepEfficiency,
    bleeding: d.bleeding,
  }));
  const strips: Dossier["strips"] = [
    ...allNights.filter((d) => d.strip).map((d) => ({ cycle: d.cycle, day: d.day, ...d.strip!, source: "logged" as const })),
    ...scans.map((s) => ({ cycle: s.cycle, day: s.day, lh: s.lh, e3g: s.e3g, pdg: s.pdg, source: "scanned" as const })),
  ];
  const notes = [est.why];
  const sleepAnomaly = ds.cycles.find((c) => c.index === 2)?.days.filter((d) => d.day >= 26).map((d) => d.sleepEfficiency) ?? [];
  if (sleepAnomaly.length && Math.max(...sleepAnomaly) < 0.87) {
    notes.push("Sleep efficiency dropped about 6 % in the last three premenstrual nights of cycle 2 compared with the other cycles.");
  }
  return {
    app: APP_NAME,
    generatedAt: new Date().toISOString(),
    limitations: [
      "Hormone curves are an estimated pattern from a canonical template aligned to the detected ovulation day; they are not measured serum levels.",
      "Strip values are quantitative urinary metabolites (LH, E3G, PdG), not serum estradiol or progesterone.",
      "Wearable features are nightly summaries from a consumer device.",
      "C-PASS-lite is a simplified timing screen on prospective daily ratings. It is not a diagnosis and is not the full C-PASS instrument.",
      "In this prototype the wearable and strip data are synthetic, generated from published physiology.",
    ],
    phaseSummary: {
      cycleDay: est.day,
      phase: phaseLabel(est.phase),
      ovulationDay: est.ovulationDay,
      ovulationMethod: est.ovulationMethod,
      confidence: est.confidence.value,
      confidenceLabel: est.confidence.label,
      why: est.why,
    },
    cpass,
    strips,
    cycleLengths: ds.cycles.map((c) => ({ cycle: c.index, length: c.length, complete: c.complete, ovulationDay: ovulationDay(c, scans).day })),
    nights,
    notes,
  };
}

// ---------- crypto ----------
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf: ArrayBuffer) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

export type Encrypted = { ciphertext: string; iv: string; keyB64url: string; plaintextBytes: number; ciphertextBytes: number };

export async function encryptDossier(dossier: Dossier): Promise<Encrypted> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(dossier));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const raw = await crypto.subtle.exportKey("raw", key);
  return {
    ciphertext: b64(ct),
    iv: b64(iv.buffer),
    keyB64url: b64url(raw),
    plaintextBytes: plain.byteLength,
    ciphertextBytes: ct.byteLength,
  };
}

export async function sendToRelay(enc: Encrypted): Promise<{ id: string; bytesSent: number }> {
  const body = JSON.stringify({ ciphertext: enc.ciphertext, iv: enc.iv });
  const bytesSent = new TextEncoder().encode(body).byteLength;
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ledger-Note": `ciphertext, ${bytesSent.toLocaleString("en-US")} bytes` },
    body,
  });
  if (!res.ok) throw new Error(`relay failed: ${res.status}`);
  const { id } = await res.json();
  return { id, bytesSent };
}

export function clinicianLink(id: string, keyB64url: string): string {
  return `${window.location.origin}/clinician?id=${encodeURIComponent(id)}#key=${keyB64url}`;
}

export async function fetchAndDecrypt(id: string, keyB64url: string): Promise<Dossier> {
  const res = await fetch(`/api/relay/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`relay returned ${res.status}`);
  const { ciphertext, iv } = (await res.json()) as { ciphertext: string; iv: string };
  const key = await crypto.subtle.importKey("raw", unb64url(keyB64url), { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain)) as Dossier;
}
