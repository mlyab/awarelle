// Synthetic 2-cycle dataset generator (seeded). Generated from published physiology; not real data.

export type Drsp = { irritability: number; anxiety: number; depressed: number; pain: number; functioning: number };
export type Strip = { lh: number; e3g: number; pdg: number };
export type DayRecord = {
  cycle: number;
  day: number;
  tempC: number;
  restingHR: number;
  hrvRmssd: number;
  sleepEfficiency: number;
  bleeding: boolean;
  strip?: Strip;
  drsp: Drsp;
};
export type Cycle = { index: number; length: number; complete: boolean; days: DayRecord[] };
export type Dataset = { cycles: Cycle[]; today: DayRecord };

export const CYCLE_LENGTH = 28;
export const TODAY_DAY = 24;
const SYNTH_OV_DAY = 13; // LH peak day; luteal rise begins the next night

// mulberry32 seeded PRNG + Box-Muller gaussian
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(next(), 1e-9);
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { next, gauss };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

function makeCycle(index: number, length: number, upTo: number, hasStrips: boolean, r: ReturnType<typeof rng>): Cycle {
  const ov = SYNTH_OV_DAY;
  const days: DayRecord[] = [];
  for (let day = 1; day <= upTo; day++) {
    const luteal = day > ov;
    const premenstrual5 = day >= length - 4;
    const premenstrual3 = day >= length - 2;

    // temperature
    let temp = 36.3 + r.gauss() * 0.06;
    if (day === ov) temp -= 0.1;
    if (day >= ov + 1 && day <= length - 1) temp += 0.38;
    if (day === length - 1) temp -= 0.15;
    if (day === length) temp += 0.1;

    const restingHR = 58 + (luteal ? 3.5 : 0) + r.gauss() * 1.2;
    const hrvRmssd = 48 - (luteal ? 8 : 0) - (premenstrual5 ? 6 : 0) + r.gauss() * 4;
    let sleepEfficiency = 0.9 + r.gauss() * 0.03;
    if (index === 2 && premenstrual3) sleepEfficiency -= 0.06;

    const bleeding = day <= 5;

    let strip: Strip | undefined;
    if (hasStrips && day >= 10 && day <= 20) {
      const lh = day === 13 ? 42 : day === 12 ? 20 : day === 14 ? 18 : 8 + r.gauss() * 2;
      const e3g = day <= 13 ? 100 + ((day - 10) / 3) * 250 : 300 - (day - 13) * 8 + r.gauss() * 15;
      const pdg = day >= 16 ? 5.5 + (day - 16) * 0.9 + r.gauss() * 0.4 : 1.2 + r.gauss() * 0.3;
      strip = { lh: r2(Math.max(2, lh)), e3g: r2(Math.max(40, e3g)), pdg: r2(Math.max(0.3, pdg)) };
    }

    const post = day >= 4 && day <= 10;
    const pre = day >= 22;
    const emo = () => clamp(Math.round((pre ? 4 : post ? 1 : 1.5) + r.gauss() * 0.6), 0, 6);
    const drsp: Drsp = {
      irritability: emo(),
      anxiety: emo(),
      depressed: emo(),
      pain: clamp(Math.round((day <= 2 ? 3 : 0.5) + r.gauss() * 0.5), 0, 6),
      functioning: clamp(Math.round((pre ? 2.5 : 0.5) + r.gauss() * 0.5), 0, 6),
    };

    days.push({
      cycle: index,
      day,
      tempC: r2(temp),
      restingHR: Math.round(restingHR * 10) / 10,
      hrvRmssd: Math.round(hrvRmssd * 10) / 10,
      sleepEfficiency: Math.round(sleepEfficiency * 1000) / 1000,
      bleeding,
      strip,
      drsp,
    });
  }
  return { index, length, complete: upTo >= length, days };
}

let cached: Dataset | null = null;
export function getDataset(): Dataset {
  if (cached) return cached;
  const r = rng(20261010);
  const c1 = makeCycle(1, CYCLE_LENGTH, CYCLE_LENGTH, true, r);
  const c2 = makeCycle(2, CYCLE_LENGTH, CYCLE_LENGTH, true, r);
  // Current cycle: no strips yet - she scans one in the demo.
  const c3 = makeCycle(3, CYCLE_LENGTH, TODAY_DAY, false, r);
  cached = { cycles: [c1, c2, c3], today: c3.days[c3.days.length - 1] };
  return cached;
}
