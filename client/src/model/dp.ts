// Differentially private model update: 128 floats from per-phase feature means, L2-clipped to 1.0, Gaussian noise sigma 1.0.
import type { Dataset } from "../data/synth";
import { ovulationDay, phaseOf, type Phase } from "../model/phase";
import type { ScanRecord } from "../state/store";

export const EPSILON = 1.0;
export const SIGMA = 1.0;
export const CLIP = 1.0;
const PHASES: Phase[] = ["menstrual", "follicular", "ovulatory", "luteal", "premenstrual"];

function gauss() {
  const u = Math.max(Math.random(), 1e-12);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Deterministic feature vector: for each phase, means of 8 features, then zero-padded to 128. */
export function featureVector(ds: Dataset, scans: ScanRecord[]): number[] {
  const out: number[] = [];
  for (const p of PHASES) {
    const rows = ds.cycles.flatMap((c) => {
      const ov = ovulationDay(c, scans).day;
      return c.days.filter((d) => phaseOf(c, d.day, ov) === p);
    });
    const m = (f: (d: (typeof rows)[number]) => number) => (rows.length ? rows.reduce((s, d) => s + f(d), 0) / rows.length : 0);
    out.push(
      m((d) => d.tempC - 36.3),
      m((d) => (d.restingHR - 60) / 10),
      m((d) => (d.hrvRmssd - 45) / 20),
      m((d) => d.sleepEfficiency - 0.9),
      m((d) => d.drsp.irritability / 6),
      m((d) => d.drsp.anxiety / 6),
      m((d) => d.drsp.depressed / 6),
      m((d) => d.drsp.functioning / 6),
    );
  }
  while (out.length < 128) out.push(0);
  return out.slice(0, 128);
}

export function privatize(v: number[]): { update: number[]; clippedNorm: number; noisedNorm: number } {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const scale = norm > CLIP ? CLIP / norm : 1;
  const clipped = v.map((x) => x * scale);
  const update = clipped.map((x) => x + gauss() * SIGMA);
  const noisedNorm = Math.sqrt(update.reduce((s, x) => s + x * x, 0));
  return { update, clippedNorm: norm * scale, noisedNorm };
}

export async function contributeUpdate(ds: Dataset, scans: ScanRecord[]): Promise<{ bytes: number; noisedNorm: number }> {
  const { update, noisedNorm } = privatize(featureVector(ds, scans));
  const body = JSON.stringify({ update: update.map((x) => Math.round(x * 1e6) / 1e6), epsilon: EPSILON });
  const bytes = new TextEncoder().encode(body).byteLength;
  const res = await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ledger-Note": "DP-noised update, 128 floats" },
    body,
  });
  if (!res.ok && res.status !== 204) throw new Error(`update rejected: ${res.status}`);
  return { bytes, noisedNorm };
}
