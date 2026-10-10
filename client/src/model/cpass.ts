// C-PASS-lite: per completed cycle, premenstrual week vs postmenstrual week on the emotional DRSP items.
import type { Cycle, Dataset, Drsp } from "../data/synth";

export const EMOTIONAL_ITEMS: (keyof Drsp)[] = ["irritability", "anxiety", "depressed"];
export const NOT_A_DIAGNOSIS =
  "This is not a diagnosis. Diagnosis requires a clinician and prospective daily ratings over two cycles — which is what this dossier contains.";

export type ItemRow = { item: keyof Drsp; pre: number; post: number; relIncrease: number; meets: boolean };
export type CycleResult = { cycle: number; items: ItemRow[]; functioningPre: number; meets: boolean };
export type CpassResult = { cycles: CycleResult[]; met: number; of: number; pattern: boolean; headline: string; footer: string };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

export function scoreCycle(c: Cycle): CycleResult {
  const pre = c.days.filter((d) => d.day >= c.length - 6 && d.day <= c.length);
  const post = c.days.filter((d) => d.day >= 4 && d.day <= 10);
  const items: ItemRow[] = EMOTIONAL_ITEMS.map((item) => {
    const p = mean(pre.map((d) => d.drsp[item]));
    const q = mean(post.map((d) => d.drsp[item]));
    const rel = q > 0 ? (p - q) / q : p > 0 ? Infinity : 0;
    return { item, pre: r1(p), post: r1(q), relIncrease: rel, meets: rel >= 0.3 && p >= 3 };
  });
  const functioningPre = r1(mean(pre.map((d) => d.drsp.functioning)));
  const meets = items.some((i) => i.meets) && functioningPre >= 2;
  return { cycle: c.index, items, functioningPre, meets };
}

export function scoreCpass(ds: Dataset): CpassResult {
  const completed = ds.cycles.filter((c) => c.complete);
  const cycles = completed.map(scoreCycle);
  const met = cycles.filter((c) => c.meets).length;
  const of = cycles.length;
  const pattern = of >= 2 && met === of;
  const headline =
    of < 2
      ? `Not enough data yet: ${of} of 2 cycles tracked.`
      : pattern
        ? `Cycle-linked mood pattern: meets timing criteria in ${met} of ${of} cycles.`
        : `No consistent cycle-linked pattern: meets timing criteria in ${met} of ${of} cycles.`;
  return { cycles, met, of, pattern, headline, footer: NOT_A_DIAGNOSIS };
}
