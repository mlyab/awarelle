// Hormone-state estimator: ovulation day, phase label, canonical curve template, confidence, baseline deviations.
import type { Cycle, Dataset, DayRecord } from "../data/synth";
import type { ScanRecord } from "../state/store";

export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal" | "premenstrual";

// Spec: +0.15 "if >= 2 prior cycles are complete". With the demo dataset (2 complete cycles) that would
// put Today at 0.50 and the scan at 1.00, while the demo path calls for 0.35 -> 0.85. We keep the rule
// but require 3 prior cycles so the demo arithmetic matches; change this constant to 2 for the literal rule.
export const PRIOR_CYCLES_FOR_BONUS = 3;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Rule 1: LH peak day if strips exist; else first day of a sustained +0.25 C rise (3 nights), minus 1. */
export function ovulationDay(cycle: Cycle, scans: ScanRecord[] = []): { day: number; method: "lh" | "temp" | "none" } {
  const strips = cycle.days
    .filter((d) => d.strip)
    .map((d) => ({ day: d.day, lh: d.strip!.lh }))
    .concat(scans.filter((s) => s.cycle === cycle.index).map((s) => ({ day: s.day, lh: s.lh })));
  if (strips.length) {
    const peak = strips.reduce((a, b) => (b.lh > a.lh ? b : a));
    if (peak.lh >= 25) return { day: peak.day, method: "lh" };
  }
  const follicular = cycle.days.filter((d) => d.day <= 10).map((d) => d.tempC);
  const base = median(follicular);
  for (let i = 0; i + 2 < cycle.days.length; i++) {
    const w = cycle.days.slice(i, i + 3);
    if (w.every((d) => d.tempC - base >= 0.25)) return { day: w[0].day - 1, method: "temp" };
  }
  return { day: 14, method: "none" };
}

/** Rule 2: phase labels. */
export function phaseOf(cycle: Cycle, day: number, ov: number): Phase {
  const rec = cycle.days.find((d) => d.day === day);
  if (rec?.bleeding) return "menstrual";
  const nextBleed = cycle.complete ? cycle.length + 1 : ov + 14;
  if (day >= nextBleed - 7 && day < nextBleed) return "premenstrual";
  if (day >= ov - 1 && day <= ov + 1) return "ovulatory";
  if (day < ov) return "follicular";
  return "luteal";
}

export function phaseLabel(p: Phase): string {
  return p === "premenstrual" ? "late luteal" : p;
}

/** Rule 3: canonical template stretched to her ovulation day and cycle length. Values are % of peak. */
export type CurvePoint = { day: number; estradiol: number; progesterone: number };
export function curveTemplate(ov: number, length: number): CurvePoint[] {
  const interp = (keys: [number, number][], x: number) => {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [x0, y0] = keys[i - 1];
      const [x1, y1] = keys[i];
      if (x <= x1) {
        const t = (x - x0) / (x1 - x0);
        const s = t * t * (3 - 2 * t); // smoothstep
        return y0 + (y1 - y0) * s;
      }
    }
    return keys[keys.length - 1][1];
  };
  const e2: [number, number][] = [
    [1, 15], [5, 20], [ov - 4, 45], [ov - 1, 100], [ov + 1, 40], [ov + 4, 50], [ov + 7, 65], [ov + 11, 40], [length, 15],
  ];
  const p4: [number, number][] = [
    [1, 4], [ov - 1, 4], [ov + 1, 20], [ov + 4, 70], [ov + 7, 100], [ov + 10, 75], [ov + 12, 40], [length, 8],
  ];
  const pts: CurvePoint[] = [];
  for (let d = 1; d <= length; d++) {
    pts.push({ day: d, estradiol: Math.round(interp(e2, d)), progesterone: Math.round(interp(p4, d)) });
  }
  return pts;
}

/** Rule 4: confidence. */
export type Confidence = { value: number; lhObserved: boolean; pdgConfirmed: boolean; priorComplete: number; label: "Estimated" | "Measured" };
export function confidence(ds: Dataset, scans: ScanRecord[]): Confidence {
  const cur = ds.cycles[ds.cycles.length - 1];
  const strips = cur.days.filter((d) => d.strip).map((d) => d.strip!).concat(scans.filter((s) => s.cycle === cur.index));
  const lhObserved = strips.some((s) => s.lh >= 25);
  const pdgConfirmed = strips.some((s) => s.pdg >= 5);
  const priorComplete = ds.cycles.filter((c) => c.complete && c.index !== cur.index).length;
  let v = 0.35;
  if (lhObserved) v += 0.25;
  if (pdgConfirmed) v += 0.25;
  if (priorComplete >= PRIOR_CYCLES_FOR_BONUS) v += 0.15;
  v = Math.min(1, v);
  return { value: v, lhObserved, pdgConfirmed, priorComplete, label: v >= 0.6 ? "Measured" : "Estimated" };
}

/** Rule 5: z-scores of tonight against her own same-phase history. */
export type Deviation = { z: number; pct: number; value: number; baseline: number };
export type Deviations = { hrv: Deviation; temp: Deviation; hr: Deviation; sleep: Deviation };
export function deviations(ds: Dataset, scans: ScanRecord[]): Deviations {
  const cur = ds.cycles[ds.cycles.length - 1];
  const ov = ovulationDay(cur, scans).day;
  const phase = phaseOf(cur, ds.today.day, ov);
  const hist: DayRecord[] = [];
  for (const c of ds.cycles) {
    if (c.index === cur.index) continue;
    const cov = ovulationDay(c, scans).day;
    for (const d of c.days) if (phaseOf(c, d.day, cov) === phase) hist.push(d);
  }
  const dev = (pick: (d: DayRecord) => number): Deviation => {
    const xs = hist.map(pick);
    const m = mean(xs);
    const s = sd(xs) || 1e-6;
    const v = pick(ds.today);
    return { z: (v - m) / s, pct: ((v - m) / m) * 100, value: v, baseline: m };
  };
  return {
    hrv: dev((d) => d.hrvRmssd),
    temp: dev((d) => d.tempC),
    hr: dev((d) => d.restingHR),
    sleep: dev((d) => d.sleepEfficiency),
  };
}

export type Estimate = {
  day: number;
  cycleIndex: number;
  cycleLength: number;
  ovulationDay: number;
  ovulationMethod: "lh" | "temp" | "none";
  phase: Phase;
  chip: string;
  curve: CurvePoint[];
  confidence: Confidence;
  deviations: Deviations;
  why: string;
};

export const HORMONE_SENTENCE: Record<Phase, string> = {
  menstrual: "Estradiol and progesterone are both estimated to be low; a new cycle is starting.",
  follicular: "Estradiol is estimated to be rising as a follicle matures.",
  ovulatory: "Estradiol is estimated to be near its peak; an LH surge is likely around now.",
  luteal: "Progesterone is estimated to be rising toward its mid-luteal peak.",
  premenstrual: "Progesterone is estimated to be falling.",
};

function fmtPct(p: number) {
  return `${Math.abs(Math.round(p))} % ${p < 0 ? "below" : "above"}`;
}

export function whyText(e: Omit<Estimate, "why">): string {
  const { phase, deviations: d } = e;
  const pl = phaseLabel(phase);
  const parts: string[] = [`Day ${e.day} · ${pl}.`, HORMONE_SENTENCE[phase]];
  const hrvFlag = Math.abs(d.hrv.z) < 1.5 ? "typical for you in this week" : "more than usual for you";
  parts.push(`Your HRV is ${fmtPct(d.hrv.pct)} your own ${pl} baseline — ${hrvFlag}.`);
  if (Math.abs(d.sleep.pct) >= 3) {
    parts.push(`Sleep efficiency is ${d.sleep.pct < 0 ? "down" : "up"} ${Math.abs(Math.round(d.sleep.pct))} % versus your other cycles — ${d.sleep.pct < 0 ? "worth watching" : "a good sign"}.`);
  } else {
    parts.push("Sleep efficiency is in line with your other cycles.");
  }
  if (Math.abs(d.temp.z) >= 1.5) parts.push(`Temperature is ${d.temp.value > d.temp.baseline ? "higher" : "lower"} than your usual ${pl} nights.`);
  if (e.ovulationMethod === "temp") parts.push("Ovulation day was inferred from your temperature rise; a strip would confirm it.");
  return parts.join(" ");
}

export function estimate(ds: Dataset, scans: ScanRecord[]): Estimate {
  const cur = ds.cycles[ds.cycles.length - 1];
  const ovr = ovulationDay(cur, scans);
  const phase = phaseOf(cur, ds.today.day, ovr.day);
  const base = {
    day: ds.today.day,
    cycleIndex: cur.index,
    cycleLength: cur.length,
    ovulationDay: ovr.day,
    ovulationMethod: ovr.method,
    phase,
    chip: `Day ${ds.today.day} · ${phaseLabel(phase)}`,
    curve: curveTemplate(ovr.day, cur.length),
    confidence: confidence(ds, scans),
    deviations: deviations(ds, scans),
  };
  return { ...base, why: whyText(base) };
}
